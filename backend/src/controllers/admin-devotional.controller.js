import {
  getAdminDevotionals,
  getAdminDevotionalById,
  createAdminDevotional,
  updateAdminDevotional
} from '../services/admin-devotional.service.js'

// ==================================================
// 1. GET ADMIN DEVOTIONAL LIST
// ==================================================

export async function getAdminDevotionalsController(req, res, next) {
  try {
    const result = await getAdminDevotionals(req.query)

    return res.status(200).json({
      status: 'success',
      message: 'Daftar devotional berhasil diambil.',
      data: result.data,
      pagination: result.pagination
    })
  } catch (error) {
    return next(error)
  }
}

// ==================================================
// 2. GET ADMIN DEVOTIONAL DETAIL
// ==================================================

export async function getAdminDevotionalByIdController(req, res, next) {
  try {
    const devotional = await getAdminDevotionalById(req.params.id)

    return res.status(200).json({
      status: 'success',
      message: 'Detail devotional berhasil diambil.',
      data: devotional
    })
  } catch (error) {
    return next(error)
  }
}

// ==================================================
// 3. CREATE ADMIN DEVOTIONAL
// ==================================================

export async function createAdminDevotionalController(req, res, next) {
  try {
    const devotional = await createAdminDevotional(req.body, req)

    return res.status(201).json({
      status: 'success',
      message: 'Devotional berhasil dibuat sebagai DRAFT.',
      data: devotional
    })
  } catch (error) {
    return next(error)
  }
}

// ==================================================
// 4. UPDATE ADMIN DEVOTIONAL
// ==================================================

export async function updateAdminDevotionalController(req, res, next) {
  try {
    const devotional = await updateAdminDevotional(
      req.params.id,
      req.body,
      req
    )

    return res.status(200).json({
      status: 'success',
      message: 'Devotional berhasil diperbarui.',
      data: devotional
    })
  } catch (error) {
    return next(error)
  }
}
