// ==================================================
// Sermons Controller
// ==================================================

import {
  getPublicSermons,
  getAdminSermons,
  createSermon,
  deleteSermon,
} from '../services/sermons.service.js'

// ==================================================
// 1. PUBLIC SERMONS
// GET /api/v1/sermons
// ==================================================

async function getPublicSermonsController(req, res, next) {
  try {
    const sermons = await getPublicSermons()

    return res.status(200).json({
      status: 'success',
      message: 'Daftar sermon berhasil diambil.',
      data: sermons,
    })
  } catch (error) {
    next(error)
  }
}

// ==================================================
// 2. ADMIN SERMONS
// GET /api/v1/admin/sermons
// ==================================================

async function getAdminSermonsController(req, res, next) {
  try {
    const sermons = await getAdminSermons()

    return res.status(200).json({
      status: 'success',
      message: 'Daftar sermon berhasil diambil.',
      data: sermons,
    })
  } catch (error) {
    next(error)
  }
}

// ==================================================
// 3. CREATE SERMON
// POST /api/v1/admin/sermons
// ==================================================

async function createSermonController(req, res, next) {
  try {
    const sermon = await createSermon(req.body, req)

    return res.status(201).json({
      status: 'success',
      message: 'Sermon berhasil ditambahkan.',
      data: sermon,
    })
  } catch (error) {
    next(error)
  }
}

// ==================================================
// 4. DELETE SERMON
// DELETE /api/v1/admin/sermons/:id
// ==================================================

async function deleteSermonController(req, res, next) {
  try {
    const sermon = await deleteSermon(req.params.id, req)

    return res.status(200).json({
      status: 'success',
      message: 'Sermon berhasil dihapus.',
      data: sermon,
    })
  } catch (error) {
    next(error)
  }
}

// ==================================================
// EXPORTS
// ==================================================

export {
  getPublicSermonsController,
  getAdminSermonsController,
  createSermonController,
  deleteSermonController,
}
