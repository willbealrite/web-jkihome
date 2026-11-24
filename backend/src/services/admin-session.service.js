import pool from '../config/database.js'

export async function getAdminSessions(adminId, currentSessionId) {
  const result = await pool.query(
    `
      SELECT
        id,
        ip_address,
        user_agent,
        created_at,
        last_used_at,
        expires_at,
        revoked_at,
        revoke_reason,
        (
          revoked_at IS NULL
          AND expires_at > NOW()
        ) AS is_active,
        (id = $2) AS is_current
      FROM public.admin_sessions
      WHERE admin_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
    [adminId, currentSessionId],
  )

  return result.rows
}

export async function revokeAdminSession({
  adminId,
  sessionId,
  currentSessionId,
  ipAddress,
  userAgent,
}) {
  if (sessionId === currentSessionId) {
    return {
      success: false,
      reason: 'current_session',
    }
  }

  const client = await pool.connect()

  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    const sessionResult = await client.query(
      `
        SELECT id, revoked_at, expires_at
        FROM public.admin_sessions
        WHERE id = $1
          AND admin_id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [sessionId, adminId],
    )

    const session = sessionResult.rows[0]

    if (!session) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return {
        success: false,
        reason: 'not_found',
      }
    }

    if (session.revoked_at !== null) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return {
        success: false,
        reason: 'already_revoked',
      }
    }

    await client.query(
      `
        UPDATE public.admin_sessions
        SET
          revoked_at = NOW(),
          revoke_reason = 'admin_revoked'
        WHERE id = $1
          AND admin_id = $2
          AND revoked_at IS NULL
      `,
      [sessionId, adminId],
    )

    await client.query(
      `
        UPDATE public.admin_refresh_tokens
        SET revoked_at = NOW()
        WHERE session_id = $1
          AND revoked_at IS NULL
      `,
      [sessionId],
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
          'ADMIN_SESSION_REVOKED',
          'AUTH',
          'admin_session',
          $2,
          'Admin mencabut session.',
          $3::jsonb,
          $4,
          $5
        )
      `,
      [
        adminId,
        sessionId,
        JSON.stringify({
          revoke_method: 'manual',
        }),
        ipAddress || null,
        userAgent || null,
      ],
    )

    await client.query('COMMIT')
    transactionStarted = false

    return {
      success: true,
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
