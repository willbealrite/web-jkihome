import {
  uploadMedia,
  getMediaList,
} from '../services/media.service.js'

import {
  getMediaDetail,
  requestMediaDeletion,
  retryMediaDeletion,
} from '../services/media-deletion.service.js'

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
// 2. Media Listing Controller
// -----------------------------------------------------

async function getMediaListController(req, res, next) {
  try {
    const mediaList = await getMediaList(req.mediaQuery)

    return res.status(200).json({
      status: 'success',
      message: 'Daftar media berhasil diambil.',
      data: mediaList,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 3. Media Detail Controller
// -----------------------------------------------------

async function getMediaDetailController(req, res, next) {
  try {
    const media = await getMediaDetail(req.params.id)

    return res.status(200).json({
      status: 'success',
      message: 'Detail media berhasil diambil.',
      data: media,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 4. Request Media Deletion Controller
// -----------------------------------------------------

async function requestMediaDeletionController(req, res, next) {
  try {
    const result = await requestMediaDeletion({
      mediaId: req.params.id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    return res.status(202).json({
      status: 'success',
      message: 'Penghapusan media telah dijadwalkan.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 5. Manual Media Deletion Retry Controller
// -----------------------------------------------------

async function retryMediaDeletionController(req, res, next) {
  try {
    const result = await retryMediaDeletion({
      mediaId: req.params.id,
      adminId: req.admin.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    return res.status(202).json({
      status: 'success',
      message: 'Retry penghapusan media telah dijadwalkan.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 6. Export Controllers
// -----------------------------------------------------

export {
  uploadMediaController,
  getMediaListController,
  getMediaDetailController,
  requestMediaDeletionController,
  retryMediaDeletionController,
}
