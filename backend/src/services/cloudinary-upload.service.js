import { cloudinary, ensureCloudinaryConfigured } from '../config/cloudinary.js'

// -----------------------------------------------------
// 1. Upload Image Buffer
// -----------------------------------------------------

function uploadImageBuffer(buffer) {
  ensureCloudinaryConfigured()

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Buffer gambar tidak valid.')
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'jki-home-church/media-library',
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          return reject(error)
        }

        resolve(result)
      },
    )

    uploadStream.end(buffer)
  })
}

// -----------------------------------------------------
// 2. Export Service
// -----------------------------------------------------

export { uploadImageBuffer }
