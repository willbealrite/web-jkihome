import bcrypt from 'bcrypt'
import pool from '../config/database.js'

const BCRYPT_ROUNDS = 12

export async function changeAdminPassword({
  adminId,
  currentPassword,
  newPassword,
  currentSessionId,
  ipAddress,
  userAgent,
}) {
  const client = await pool.connect()

  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    // Lock akun Admin untuk mencegah perubahan password bersamaan.
    const adminResult = await client.query(
      `
        SELECT id, password_hash
        FROM public.admins
        WHERE id = $1
          AND is_active = TRUE
        LIMIT 1
        FOR UPDATE
      `,
      [adminId],
    )

    const admin = adminResult.rows[0]

    if (!admin) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return {
        success: false,
        reason: 'admin_not_found',
      }
    }

    // Verifikasi password saat ini.
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      admin.password_hash,
    )

    if (!passwordMatches) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return {
        success: false,
        reason: 'invalid_current_password',
      }
    }

    // Password baru tidak boleh sama dengan password saat ini.
    const samePassword = await bcrypt.compare(
      newPassword,
      admin.password_hash,
    )

    if (samePassword) {
      await client.query('ROLLBACK')
      transactionStarted = false

      return {
        success: false,
        reason: 'same_password',
      }
    }

    const newPasswordHash = await bcrypt.hash(
      newPassword,
      BCRYPT_ROUNDS,
    )

    // Simpan hash password baru.
    await client.query(
      `
        UPDATE public.admins
        SET
          password_hash = $1,
          password_changed_at = NOW()
        WHERE id = $2
      `,
      [newPasswordHash, adminId],
    )

    // Cabut seluruh session, termasuk session saat ini.
    await client.query(
      `
        UPDATE public.admin_sessions
        SET
          revoked_at = NOW(),
          revoke_reason = 'password_changed'
        WHERE admin_id = $1
          AND revoked_at IS NULL
      `,
      [adminId],
    )

    // Cabut seluruh refresh token yang masih aktif.
    await client.query(
      `
        UPDATE public.admin_refresh_tokens AS rt
        SET revoked_at = NOW()
        FROM public.admin_sessions AS s
        WHERE rt.session_id = s.id
          AND s.admin_id = $1
          AND rt.revoked_at IS NULL
      `,
      [adminId],
    )

    // Catat aktivitas tanpa menyimpan nilai password.
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
          'ADMIN_PASSWORD_CHANGED',
          'AUTH',
          'admin',
          $1,
          'Admin berhasil mengubah password.',
          $2::jsonb,
          $3,
          $4
        )
      `,
      [
        adminId,
        JSON.stringify({
          session_policy: 'all_sessions_revoked',
          initiated_by_session: currentSessionId,
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
