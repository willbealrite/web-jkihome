import jwt from 'jsonwebtoken'

import {
  createHash,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'

import pool from '../config/database.js'
import { env } from '../config/env.js'

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  AUTH_TOKEN_ISSUER,
  ADMIN_TOKEN_AUDIENCE,
} from '../config/auth.js'

function hashRefreshToken(token) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

function createAccessToken(adminId, sessionId) {
  return jwt.sign(
    {
      sub: adminId,
      sid: sessionId,
      typ: 'access',
    },
    env.jwt.accessSecret,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: AUTH_TOKEN_ISSUER,
      audience: ADMIN_TOKEN_AUDIENCE,
    },
  )
}

function createRefreshToken(adminId, sessionId, tokenId) {
  return jwt.sign(
    {
      sub: adminId,
      sid: sessionId,
      jti: tokenId,
      typ: 'refresh',
    },
    env.jwt.refreshSecret,
    {
      algorithm: 'HS256',
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      issuer: AUTH_TOKEN_ISSUER,
      audience: ADMIN_TOKEN_AUDIENCE,
    },
  )
}

function isMatchingHash(storedHash, incomingHash) {
  if (
    typeof storedHash !== 'string' ||
    storedHash.length !== 64 ||
    !/^[a-f0-9]{64}$/i.test(storedHash)
  ) {
    return false
  }

  return timingSafeEqual(
    Buffer.from(storedHash, 'hex'),
    Buffer.from(incomingHash, 'hex'),
  )
}

export async function refreshAdminSession(
  rawRefreshToken,
  { ipAddress, userAgent } = {},
) {
  let payload

  try {
    payload = jwt.verify(
      rawRefreshToken,
      env.jwt.refreshSecret,
      {
        algorithms: ['HS256'],
        issuer: AUTH_TOKEN_ISSUER,
        audience: ADMIN_TOKEN_AUDIENCE,
      },
    )
  } catch {
    return null
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.typ !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    return null
  }

  const incomingHash = hashRefreshToken(rawRefreshToken)

  const client = await pool.connect()

  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    // Lock token and session to prevent concurrent rotation.
    const tokenResult = await client.query(
      `
        SELECT
          rt.id AS token_id,
          rt.token_hash,
          rt.expires_at AS token_expires_at,
          rt.consumed_at,
          rt.revoked_at AS token_revoked_at,

          s.id AS session_id,
          s.admin_id,
          s.expires_at AS session_expires_at,
          s.revoked_at AS session_revoked_at,

          a.id AS active_admin_id,
          a.name,
          a.email,
          a.is_active

        FROM public.admin_refresh_tokens AS rt

        INNER JOIN public.admin_sessions AS s
          ON s.id = rt.session_id

        INNER JOIN public.admins AS a
          ON a.id = s.admin_id

        WHERE rt.id = $1
          AND rt.session_id = $2
          AND s.admin_id = $3

        FOR UPDATE OF rt, s
      `,
      [payload.jti, payload.sid, payload.sub],
    )

    const record = tokenResult.rows[0]

    if (!record) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return null
    }

    // Reuse detection:
    // A previously consumed token is being presented again.
    if (
      record.consumed_at &&
      !record.session_revoked_at
    ) {
      await client.query(
        `
          UPDATE public.admin_sessions
          SET
            revoked_at = NOW(),
            revoke_reason = 'refresh_token_reuse_detected'
          WHERE id = $1
            AND revoked_at IS NULL
        `,
        [record.session_id],
      )

      await client.query(
        `
          UPDATE public.admin_refresh_tokens
          SET revoked_at = NOW()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [record.session_id],
      )

      await client.query(
        `
          INSERT INTO public.admin_activity_logs (
            admin_id,
            action,
            module,
            entity_type,
            entity_id,
            description,
            metadata,
            ip_address,
            user_agent
          )
          VALUES (
            $1,
            'ADMIN_REFRESH_TOKEN_REUSE',
            'AUTH',
            'admin_session',
            $2,
            'Refresh token reuse terdeteksi. Session dicabut.',
            $3::jsonb,
            $4,
            $5
          )
        `,
        [
          record.admin_id,
          record.session_id,
          JSON.stringify({
            token_id: record.token_id,
            reason: 'refresh_token_reuse_detected',
          }),
          ipAddress || null,
          userAgent || null,
        ],
      )

      await client.query('COMMIT')
      transactionStarted = false

      return {
        reuseDetected: true,
      }
    }

    // Reject invalid, revoked, or expired sessions.
    if (
      record.token_revoked_at ||
      record.session_revoked_at ||
      !record.is_active ||
      new Date(record.token_expires_at) <= new Date() ||
      new Date(record.session_expires_at) <= new Date()
    ) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return null
    }

    // Verify that the presented token matches its database hash.
    if (!isMatchingHash(record.token_hash, incomingHash)) {
      await client.query(
        `
          UPDATE public.admin_sessions
          SET
            revoked_at = NOW(),
            revoke_reason = 'refresh_token_hash_mismatch'
          WHERE id = $1
            AND revoked_at IS NULL
        `,
        [record.session_id],
      )

      await client.query(
        `
          UPDATE public.admin_refresh_tokens
          SET revoked_at = NOW()
          WHERE session_id = $1
            AND revoked_at IS NULL
        `,
        [record.session_id],
      )

      // Record the hash mismatch without storing the token itself.
      await client.query(
        `
          INSERT INTO public.admin_activity_logs (
            admin_id,
            action,
            module,
            entity_type,
            entity_id,
            description,
            metadata,
            ip_address,
            user_agent
          )
          VALUES (
            $1,
            'ADMIN_REFRESH_TOKEN_HASH_MISMATCH',
            'AUTH',
            'admin_session',
            $2,
            'Refresh token hash tidak cocok. Session dicabut.',
            $3::jsonb,
            $4,
            $5
          )
        `,
        [
          record.admin_id,
          record.session_id,
          JSON.stringify({
            token_id: record.token_id,
            reason: 'refresh_token_hash_mismatch',
          }),
          ipAddress || null,
          userAgent || null,
        ],
      )

      await client.query('COMMIT')
      transactionStarted = false

      return {
        reuseDetected: true,
      }
    }

    const newTokenId = randomUUID()

    const newExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
    )

    const newAccessToken = createAccessToken(
      record.admin_id,
      record.session_id,
    )

    const newRefreshToken = createRefreshToken(
      record.admin_id,
      record.session_id,
      newTokenId,
    )

    const newRefreshTokenHash = hashRefreshToken(
      newRefreshToken,
    )

    // Insert replacement token first so the replacement
    // foreign key can reference an existing row.
    await client.query(
      `
        INSERT INTO public.admin_refresh_tokens (
          id,
          session_id,
          token_hash,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        newTokenId,
        record.session_id,
        newRefreshTokenHash,
        newExpiresAt,
      ],
    )

    const consumedResult = await client.query(
      `
        UPDATE public.admin_refresh_tokens
        SET
          consumed_at = NOW(),
          replaced_by_token_id = $2
        WHERE id = $1
          AND consumed_at IS NULL
          AND revoked_at IS NULL
      `,
      [record.token_id, newTokenId],
    )

    if (consumedResult.rowCount !== 1) {
      throw new Error('REFRESH_TOKEN_ROTATION_CONFLICT')
    }

    // Extend the session for another seven days.
    await client.query(
      `
        UPDATE public.admin_sessions
        SET
          last_used_at = NOW(),
          expires_at = $2
        WHERE id = $1
      `,
      [record.session_id, newExpiresAt],
    )

    await client.query('COMMIT')
    transactionStarted = false

    return {
      admin: {
        id: record.active_admin_id,
        name: record.name,
        email: record.email,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    }
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => {})
    }

    throw error
  } finally {
    client.release()
  }
}
