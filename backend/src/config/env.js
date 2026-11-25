import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

// Load environment variables from backend/.env
dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
})

const errors = []

function getRequiredString(name) {
  const value = process.env[name]

  if (typeof value !== 'string' || value.trim() === '') {
    errors.push(`${name} wajib diisi.`)
    return ''
  }

  return value
}

function getOptionalString(name) {
  const value = process.env[name]

  return typeof value === 'string' ? value.trim() : ''
}

function getInteger(name, min, max) {
  const value = getRequiredString(name)
  const parsed = Number(value)

  if (
    !Number.isInteger(parsed) ||
    parsed < min ||
    parsed > max
  ) {
    errors.push(`${name} harus berupa angka antara ${min} dan ${max}.`)
    return min
  }

  return parsed
}

// Application
const nodeEnv = getRequiredString('NODE_ENV')
const port = getInteger('PORT', 1, 65535)

if (!['development', 'test', 'production'].includes(nodeEnv)) {
  errors.push('NODE_ENV harus development, test, atau production.')
}

// Database
const database = {
  host: getRequiredString('DB_HOST'),
  port: getInteger('DB_PORT', 1, 65535),
  name: getRequiredString('DB_NAME'),
  user: getRequiredString('DB_USER'),
  password: getRequiredString('DB_PASSWORD'),
}

// Authentication
const accessSecret = getRequiredString('JWT_ACCESS_SECRET')
const refreshSecret = getRequiredString('JWT_REFRESH_SECRET')

if (accessSecret.length < 32) {
  errors.push('JWT_ACCESS_SECRET minimal 32 karakter.')
}

if (refreshSecret.length < 32) {
  errors.push('JWT_REFRESH_SECRET minimal 32 karakter.')
}

if (
  accessSecret &&
  refreshSecret &&
  accessSecret === refreshSecret
) {
  errors.push('JWT access dan refresh secret harus berbeda.')
}

// Frontend
const clientOrigin = getRequiredString('CLIENT_ORIGIN')

if (clientOrigin) {
  try {
    const parsedOrigin = new URL(clientOrigin)

    if (
      !['http:', 'https:'].includes(parsedOrigin.protocol) ||
      parsedOrigin.origin !== clientOrigin
    ) {
      errors.push(
        'CLIENT_ORIGIN harus berupa origin HTTP/HTTPS yang valid tanpa path.',
      )
    }
  } catch {
    errors.push('CLIENT_ORIGIN harus berupa URL yang valid.')
  }
}

// Cloudinary
const cloudinary = {
  cloudName: getOptionalString('CLOUDINARY_CLOUD_NAME'),
  apiKey: getOptionalString('CLOUDINARY_API_KEY'),
  apiSecret: getOptionalString('CLOUDINARY_API_SECRET'),
}

// Stop application when configuration is invalid
if (errors.length > 0) {
  console.error('[ENVIRONMENT CONFIGURATION ERROR]')

  for (const error of errors) {
    console.error(`- ${error}`)
  }

  throw new Error('Environment configuration tidak valid.')
}

// Export validated configuration
export const env = Object.freeze({
  nodeEnv,
  port,
  database: Object.freeze(database),
  jwt: Object.freeze({
    accessSecret,
    refreshSecret,
  }),
  clientOrigin,
  cloudinary: Object.freeze(cloudinary),
})
