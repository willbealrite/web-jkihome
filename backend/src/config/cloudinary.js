import { v2 as cloudinary } from 'cloudinary'
import { env } from './env.js'

// -----------------------------------------------------
// 1. Cloudinary Configuration
// -----------------------------------------------------

const isConfigured = Boolean(
  env.cloudinary.cloudName &&
  env.cloudinary.apiKey &&
  env.cloudinary.apiSecret,
)

// -----------------------------------------------------
// 2. Configure Cloudinary
// -----------------------------------------------------

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  })
}

// -----------------------------------------------------
// 3. Configuration Guard
// -----------------------------------------------------

function ensureCloudinaryConfigured() {
  if (!isConfigured) {
    throw new Error('Cloudinary belum dikonfigurasi.')
  }
}

// -----------------------------------------------------
// 4. Export
// -----------------------------------------------------

export { cloudinary, isConfigured, ensureCloudinaryConfigured }
