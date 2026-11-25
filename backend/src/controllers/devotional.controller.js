import {
  getTodayDevotional,
  getPublicDevotionals,
  getPublicDevotionalBySlug
} from '../services/devotional.service.js'

// ==================================================
// 1. GET TODAY DEVOTIONAL
// ==================================================

export async function getTodayDevotionalController(req, res, next) {
  try {
    const data = await getTodayDevotional()

    return res.status(200).json({
      status: 'success',
      message: 'Renungan hari ini berhasil diambil',
      data
    })
  } catch (error) {
    next(error)
  }
}

// ==================================================
// 2. GET PUBLIC DEVOTIONAL LIST
// ==================================================

export async function getPublicDevotionalsController(req, res, next) {
  try {
    const result = await getPublicDevotionals(req.query)

    return res.status(200).json({
      status: 'success',
      message: 'Daftar renungan harian berhasil diambil',
      data: result.data,
      pagination: result.pagination
    })
  } catch (error) {
    next(error)
  }
}

// ==================================================
// 3. GET PUBLIC DEVOTIONAL DETAIL
// ==================================================

export async function getPublicDevotionalBySlugController(req, res, next) {
  try {
    const data = await getPublicDevotionalBySlug(req.params.slug)

    return res.status(200).json({
      status: 'success',
      message: 'Detail renungan harian berhasil diambil',
      data
    })
  } catch (error) {
    next(error)
  }
}
