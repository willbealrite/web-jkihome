import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto'

import pool from '../config/database.js'
import { env } from '../config/env.js'

import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  AUTH_TOKEN_ISSUER,
  ADMIN_TOKEN_AUDIENCE,
} from '../config/auth.js'

const BCRYPT_ROUNDS = 12

let dummyPasswordHashPromise

async function getDummyPasswordHash() {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = bcrypt.hash(
      randomBytes(32).toString('hex'),
      BCRYPT_ROUNDS,
    )
  }

  return dummyPasswordHashPromise
}

function hashRefreshToken(token) {
  return createHash('sha256')
    .update(token)
    .digest('hex')
}

export async function loginAdmin({
  email,
  password,
  ipAddress,
  userAgent,
}) {
  const normalizedEmail = email.trim().toLowerCase()

  const client = await pool.connect()

  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    const adminResult = await client.query(
      `
        SELECT
          id,
          name,
          email,
          password_hash,
          is_active
        FROM public.admins
        WHERE email = $1
        LIMIT 1
        FOR UPDATE
      `,
      [normalizedEmail],
    )

    const admin = adminResult.rows[0]

    const passwordHash = admin?.is_active
      ? admin.password_hash
      : await getDummyPasswordHash()

    const passwordMatches = await bcrypt.compare(
      password,
      passwordHash,
    )

    if (!admin || !admin.is_active || !passwordMatches) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return null
    }

    const sessionId = randomUUID()
    const refreshTokenId = randomUUID()

    const refreshExpiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000,
    )

    const accessToken = jwt.sign(
      {
        sub: admin.id,
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

    const refreshToken = jwt.sign(
      {
        sub: admin.id,
        sid: sessionId,
        jti: refreshTokenId,
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

    const refreshTokenHash = hashRefreshToken(refreshToken)

    await client.query(
      `
        INSERT INTO public.admin_sessions (
          id,
          admin_id,
          ip_address,
          user_agent,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        sessionId,
        admin.id,
        ipAddress || null,
        userAgent || null,
        refreshExpiresAt,
      ],
    )

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
        refreshTokenId,
        sessionId,
        refreshTokenHash,
        refreshExpiresAt,
      ],
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
          'ADMIN_LOGIN',
          'AUTH',
          'admin_session',
          $2,
          'Admin berhasil login.',
          $3::jsonb,
          $4,
          $5
        )
      `,
      [
        admin.id,
        sessionId,
        JSON.stringify({
          authentication_method: 'password',
        }),
        ipAddress || null,
        userAgent || null,
      ],
    )

    await client.query('COMMIT')
    transactionStarted = false

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
      accessToken,
      refreshToken,
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
