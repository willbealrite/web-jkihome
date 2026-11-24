import { env } from '../config/env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const ADMIN_LOGIN_PATH = '/api/v1/admin/auth/login'

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  const hasRefreshCookie = Boolean(
    req.cookies?.['__Secure-jki_refresh'],
  )

  const isAdminLogin =
    req.method === 'POST' &&
    req.path === ADMIN_LOGIN_PATH

  if (!hasRefreshCookie && !isAdminLogin) {
    return next()
  }

  const origin = req.get('Origin')

  if (!origin || origin !== env.clientOrigin) {
    return res.status(403).json({
      status: 'error',
      message: 'Origin request tidak diizinkan.',
    })
  }

  next()
}

export default csrfProtection
