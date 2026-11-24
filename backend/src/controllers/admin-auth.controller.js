import { loginAdmin } from '../services/admin-auth.service.js'
import { refreshAdminSession } from '../services/admin-refresh.service.js'
import { logoutAdmin } from '../services/admin-logout.service.js'
import { getAdminSessions } from '../services/admin-session.service.js'
import { revokeAdminSession } from '../services/admin-session.service.js'
import { changeAdminPassword } from '../services/admin-password.service.js'

import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_OPTIONS,
  REFRESH_COOKIE_BASE_OPTIONS,
} from '../config/auth.js'

// POST /api/v1/admin/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        status: 'error',
        message: 'Password melebihi batas yang diizinkan.',
      })
    }

    const result = await loginAdmin({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    if (!result) {
      return res.status(401).json({
        status: 'error',
        message: 'Email atau password tidak valid.',
      })
    }

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      REFRESH_COOKIE_OPTIONS,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Login berhasil.',
      data: {
        admin: result.admin,
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
}

// POST /api/v1/admin/auth/refresh
export async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME]

    if (!rawRefreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token tidak tersedia.',
      })
    }

    const result = await refreshAdminSession(
      rawRefreshToken,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    )

    if (!result) {
      res.clearCookie(
        REFRESH_COOKIE_NAME,
        REFRESH_COOKIE_BASE_OPTIONS,
      )

      return res.status(401).json({
        status: 'error',
        message: 'Refresh token tidak valid atau session sudah berakhir.',
      })
    }

    if (result.reuseDetected) {
      res.clearCookie(
        REFRESH_COOKIE_NAME,
        REFRESH_COOKIE_BASE_OPTIONS,
      )

      return res.status(401).json({
        status: 'error',
        message: 'Aktivitas refresh token mencurigakan. Silakan login kembali.',
      })
    }

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      REFRESH_COOKIE_OPTIONS,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Access token berhasil diperbarui.',
      data: {
        admin: result.admin,
        accessToken: result.accessToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/v1/admin/auth/me
export function getCurrentAdmin(req, res) {
  return res.status(200).json({
    status: 'success',
    message: 'Admin berhasil diverifikasi.',
    data: {
      admin: {
        id: req.admin.id,
        name: req.admin.name,
        email: req.admin.email,
      },
    },
  })
}

// POST /api/v1/admin/auth/logout
export async function logout(req, res, next) {
  try {
    await logoutAdmin({
      adminId: req.admin.id,
      sessionId: req.admin.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.clearCookie(
      REFRESH_COOKIE_NAME,
      REFRESH_COOKIE_BASE_OPTIONS,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Logout berhasil.',
    })
  } catch (error) {
    next(error)
  }
}

// GET /api/v1/admin/auth/sessions
export async function getSessions(req, res, next) {
  try {
    const sessions = await getAdminSessions(
      req.admin.id,
      req.admin.sessionId,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Daftar session berhasil diambil.',
      data: {
        sessions,
      },
    })
  } catch (error) {
    next(error)
  }
}

// DELETE /api/v1/admin/auth/sessions/:id
export async function revokeSession(req, res, next) {
  try {
    const result = await revokeAdminSession({
      adminId: req.admin.id,
      sessionId: req.params.id,
      currentSessionId: req.admin.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    if (!result.success) {
      if (result.reason === 'current_session') {
        return res.status(400).json({
          status: 'error',
          message: 'Gunakan endpoint logout untuk mencabut session saat ini.',
        })
      }

      if (result.reason === 'already_revoked') {
        return res.status(409).json({
          status: 'error',
          message: 'Session sudah dicabut sebelumnya.',
        })
      }

      return res.status(404).json({
        status: 'error',
        message: 'Session tidak ditemukan.',
      })
    }

    return res.status(200).json({
      status: 'success',
      message: 'Session berhasil dicabut.',
    })
  } catch (error) {
    next(error)
  }
}


// POST /api/v1/admin/auth/change-password
export async function changePassword(req, res, next) {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body

    // Validasi panjang password berdasarkan jumlah karakter.
    if ([...newPassword].length < 12) {
      return res.status(400).json({
        status: 'error',
        message: 'Password baru minimal 12 karakter.',
      })
    }

    // Batas bcrypt adalah 72 byte UTF-8.
    if (
      Buffer.byteLength(currentPassword, 'utf8') > 72 ||
      Buffer.byteLength(newPassword, 'utf8') > 72
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Password melebihi batas 72 byte UTF-8.',
      })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Konfirmasi password baru tidak cocok.',
      })
    }

    const result = await changeAdminPassword({
      adminId: req.admin.id,
      currentPassword,
      newPassword,
      currentSessionId: req.admin.sessionId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    if (!result.success) {
      if (result.reason === 'invalid_current_password') {
        return res.status(401).json({
          status: 'error',
          message: 'Password saat ini tidak valid.',
        })
      }

      if (result.reason === 'same_password') {
        return res.status(400).json({
          status: 'error',
          message: 'Password baru harus berbeda dari password saat ini.',
        })
      }

      return res.status(404).json({
        status: 'error',
        message: 'Akun Admin tidak ditemukan atau tidak aktif.',
      })
    }

    // Hapus refresh cookie karena semua session telah dicabut.
    res.clearCookie(
      REFRESH_COOKIE_NAME,
      REFRESH_COOKIE_BASE_OPTIONS,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Password berhasil diubah. Silakan login kembali.',
    })
  } catch (error) {
    next(error)
  }
}

