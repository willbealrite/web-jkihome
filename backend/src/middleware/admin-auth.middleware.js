import jwt from 'jsonwebtoken'

import pool from '../config/database.js'
import { env } from '../config/env.js'

import {
  AUTH_TOKEN_ISSUER,
  ADMIN_TOKEN_AUDIENCE,
} from '../config/auth.js'

function unauthorized(res) {
  return res.status(401).json({
    status: 'error',
    message: 'Authentication diperlukan atau session sudah tidak valid.',
  })
}

export async function authenticateAdmin(req, res, next) {
  const authorization = req.get('Authorization')

  if (!authorization) {
    return unauthorized(res)
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i)

  if (!match) {
    return unauthorized(res)
  }

  let payload

  try {
    payload = jwt.verify(
      match[1],
      env.jwt.accessSecret,
      {
        algorithms: ['HS256'],
        issuer: AUTH_TOKEN_ISSUER,
        audience: ADMIN_TOKEN_AUDIENCE,
      },
    )
  } catch {
    return unauthorized(res)
  }

  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.typ !== 'access' ||
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string'
  ) {
    return unauthorized(res)
  }

  try {
    const result = await pool.query(
      `
        UPDATE public.admin_sessions AS s
        SET last_used_at = GREATEST(NOW(), s.created_at)
        FROM public.admins AS a
        WHERE s.id = $1
          AND s.admin_id = a.id
          AND a.id = $2
          AND a.is_active = TRUE
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        RETURNING
          a.id,
          a.name,
          a.email,
          s.id AS session_id
      `,
      [payload.sid, payload.sub],
    )

    if (result.rowCount === 0) {
      return unauthorized(res)
    }

    const admin = result.rows[0]

    req.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      sessionId: admin.session_id,
    }

    next()
  } catch (error) {
    next(error)
  }
}