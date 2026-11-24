import pool from '../config/database.js'

export async function logoutAdmin({
  adminId,
  sessionId,
  ipAddress,
  userAgent,
}) {
  const client = await pool.connect()

  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    const sessionResult = await client.query(
      `
        SELECT id, revoked_at
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
      return false
    }

    const wasActive = session.revoked_at === null

    await client.query(
      `
        UPDATE public.admin_sessions
        SET
          revoked_at = COALESCE(revoked_at, NOW()),
          revoke_reason = CASE
            WHEN revoked_at IS NULL THEN 'admin_logout'
            ELSE revoke_reason
          END
        WHERE id = $1
          AND admin_id = $2
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

    if (wasActive) {
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
            'ADMIN_LOGOUT',
            'AUTH',
            'admin_session',
            $2,
            'Admin berhasil logout.',
            $3::jsonb,
            $4,
            $5
          )
        `,
        [
          adminId,
          sessionId,
          JSON.stringify({
            logout_method: 'manual',
          }),
          ipAddress || null,
          userAgent || null,
        ],
      )
    }

    await client.query('COMMIT')
    transactionStarted = false

    return true
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => {})
    }

    throw error
  } finally {
    client.release()
  }
}