export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

export const AUTH_TOKEN_ISSUER = 'jki-home-api'

export const ADMIN_TOKEN_AUDIENCE = 'jki-home-admin'

export const REFRESH_COOKIE_NAME = '__Secure-jki_refresh'

export const REFRESH_COOKIE_BASE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  path: '/api/v1/admin/auth',
})

export const REFRESH_COOKIE_OPTIONS = Object.freeze({
  ...REFRESH_COOKIE_BASE_OPTIONS,
  maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
})
