import {
  getPublicFlyers,
  getAdminFlyers,
  createSpeakerFlyer,
  updateSpeakerFlyer,
  deleteSpeakerFlyer,
} from '../services/speaker-flyer.service.js'

// -----------------------------------------------------
// 1. Public Listing
// -----------------------------------------------------

export async function listPublicFlyers(req, res, next) {
  try {
    const result = await getPublicFlyers(req.query)

    return res.status(200).json({
      status: 'success',
      data: result.items,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 2. Admin Listing
// -----------------------------------------------------

export async function listAdminFlyers(req, res, next) {
  try {
    const result = await getAdminFlyers(req.query)

    return res.status(200).json({
      status: 'success',
      data: result.items,
      pagination: result.pagination,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 3. Create Speaker Flyer
// -----------------------------------------------------

export async function createFlyer(req, res, next) {
  try {
    const { media_id } = req.body

    const result = await createSpeakerFlyer(media_id, req)

    return res.status(201).json({
      status: 'success',
      message: 'Flyer berhasil ditambahkan ke galeri.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 4. Update Speaker Flyer
// -----------------------------------------------------

export async function updateFlyer(req, res, next) {
  try {
    const result = await updateSpeakerFlyer(
      req.params.id,
      req.body,
      req,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Flyer berhasil diperbarui.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// 5. Delete Speaker Flyer
// -----------------------------------------------------

export async function deleteFlyer(req, res, next) {
  try {
    const result = await deleteSpeakerFlyer(
      req.params.id,
      req,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Flyer berhasil dihapus dari galeri.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
