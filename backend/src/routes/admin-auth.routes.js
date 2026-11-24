import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'

import {
  login,
  refresh,
  getCurrentAdmin,
  logout,
  getSessions,
  revokeSession,
  changePassword,
} from '../controllers/admin-auth.controller.js'

import {
  authenticateAdmin,
} from '../middleware/admin-auth.middleware.js'

import validate from '../middleware/validate.middleware.js'

const router = Router()

// Login rate limiter
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,

  handler: (_req, res) => {
    return res.status(429).json({
      status: 'error',
      message: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.',
    })
  },
})

// Refresh rate limiter
const refreshRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  handler: (_req, res) => {
    return res.status(429).json({
      status: 'error',
      message: 'Terlalu banyak permintaan refresh. Silakan coba lagi nanti.',
    })
  },
})

// Change password rate limiter
const changePasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,

  handler: (_req, res) => {
    return res.status(429).json({
      status: 'error',
      message: 'Terlalu banyak percobaan perubahan password. Silakan coba lagi nanti.',
    })
  },
})

// Login validation
const loginValidation = validate({
  body: {
    email: {
      required: true,
      type: 'string',
      maxLength: 255,
      email: true,
    },
    password: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 72,
    },
  },
})

// Change password validation
const changePasswordValidation = validate({
  body: {
    currentPassword: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 256,
    },
    newPassword: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 256,
    },
    confirmPassword: {
      required: true,
      type: 'string',
      minLength: 1,
      maxLength: 256,
    },
  },
})

// POST /api/v1/admin/auth/login
router.post(
  '/login',
  loginRateLimiter,
  loginValidation,
  login,
)

// POST /api/v1/admin/auth/refresh
router.post(
  '/refresh',
  refreshRateLimiter,
  refresh,
)

// GET /api/v1/admin/auth/me
router.get(
  '/me',
  authenticateAdmin,
  getCurrentAdmin,
)

// POST /api/v1/admin/auth/logout
router.post(
  '/logout',
  authenticateAdmin,
  logout,
)

// GET /api/v1/admin/auth/sessions
router.get(
  '/sessions',
  authenticateAdmin,
  getSessions,
)

// DELETE /api/v1/admin/auth/sessions/:id
router.delete(
  '/sessions/:id',
  authenticateAdmin,
  revokeSession,
)

// POST /api/v1/admin/auth/change-password
router.post(
  '/change-password',
  authenticateAdmin,
  changePasswordRateLimiter,
  changePasswordValidation,
  changePassword,
)

export default router