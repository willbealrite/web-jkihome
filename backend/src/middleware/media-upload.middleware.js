import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import sharp from 'sharp'

// -----------------------------------------------------
// 1. Upload Configuration
// -----------------------------------------------------

const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
]

const allowedExtensions = [
  'jpg',
  'png',
  'webp',
]

const maxPixels = 40_000_000

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(
        'Format gambar tidak diizinkan.',
      )

      error.statusCode = 400

      return callback(error)
    }

    callback(null, true)
  },
})

// -----------------------------------------------------
// 2. File Signature Validation
// -----------------------------------------------------

async function validateImageSignature(req, res, next) {
  try {
    if (!req.file) {
      const error = new Error(
        'File gambar wajib diunggah.',
      )

      error.statusCode = 400

      return next(error)
    }

    const detectedType = await fileTypeFromBuffer(
      req.file.buffer,
    )

    if (!detectedType) {
      const error = new Error(
        'File tidak memiliki format gambar yang valid.',
      )

      error.statusCode = 400

      return next(error)
    }

    if (
      !allowedMimeTypes.includes(detectedType.mime) ||
      !allowedExtensions.includes(detectedType.ext)
    ) {
      const error = new Error(
        'Format file tidak diizinkan.',
      )

      error.statusCode = 400

      return next(error)
    }

    if (req.file.mimetype !== detectedType.mime) {
      const error = new Error(
        'Format file tidak sesuai dengan deklarasi file.',
      )

      error.statusCode = 400

      return next(error)
    }

    // -------------------------------------------------
    // 3. Image Decoding and Pixel Limit
    // -------------------------------------------------

    const image = sharp(req.file.buffer, {
      limitInputPixels: maxPixels,
      failOn: 'error',
    })

    let metadata

    try {
      metadata = await image.metadata()
    } catch (imageError) {
      const validationError = new Error(
        'Gambar tidak dapat dibaca atau tidak valid.',
      )

      validationError.statusCode = 400

      return next(validationError)
    }

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width <= 0 ||
      metadata.height <= 0
    ) {
      const error = new Error(
        'Dimensi gambar tidak valid.',
      )

      error.statusCode = 400

      return next(error)
    }

    if (
      metadata.width * metadata.height > maxPixels
    ) {
      const error = new Error(
        'Dimensi gambar melebihi batas pemrosesan.',
      )

      error.statusCode = 400

      return next(error)
    }

    // -------------------------------------------------
    // 4. Image Re-encoding
    // -------------------------------------------------

    let sanitizedBuffer

    try {
      switch (detectedType.mime) {
        case 'image/jpeg':
          sanitizedBuffer = await image
            .rotate()
            .jpeg()
            .toBuffer()
          break

        case 'image/png':
          sanitizedBuffer = await image
            .rotate()
            .png()
            .toBuffer()
          break

        case 'image/webp':
          sanitizedBuffer = await image
            .rotate()
            .webp()
            .toBuffer()
          break

        default: {
          const error = new Error(
            'Format gambar tidak diizinkan.',
          )

          error.statusCode = 400

          return next(error)
        }
      }
    } catch (imageError) {
      const validationError = new Error(
        'Gambar tidak dapat diproses atau tidak valid.',
      )

      validationError.statusCode = 400

      return next(validationError)
    }

    // -------------------------------------------------
    // 5. Replace Buffer with Sanitized Image
    // -------------------------------------------------

    req.file.buffer = sanitizedBuffer
    req.file.mimetype = detectedType.mime
    req.file.size = sanitizedBuffer.length

    next()
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 6. Export Middleware
// -----------------------------------------------------

export { upload, validateImageSignature }
