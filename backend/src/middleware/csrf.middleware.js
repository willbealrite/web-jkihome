import { env } from '../config/env.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function csrfProtection(req, res, next) {
  // Safe methods do not modify application state.
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  // Login does not depend on an existing refresh cookie.
  const hasRefreshCookie = Boolean(req.cookies?.['__Secure-jki_refresh'])

  if (!hasRefreshCookie) {
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
