import { uploadMedia } from '../services/media.service.js'

// -----------------------------------------------------
// 1. Upload Media Controller
// -----------------------------------------------------

async function uploadMediaController(req, res, next) {
  try {
    const media = await uploadMedia({
      file: req.file,
      adminId: req.admin.id,
      altText: req.body.alt_text || null,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    // -------------------------------------------------
    // 2. Response
    // -------------------------------------------------

    return res.status(201).json({
      status: 'success',
      message: 'Media berhasil diunggah.',
      data: media,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 3. Export Controller
// -----------------------------------------------------

export { uploadMediaController }
