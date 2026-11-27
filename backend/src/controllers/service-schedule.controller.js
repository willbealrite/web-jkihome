import {
  getPublicServiceSchedules,
  getAdminServiceSchedules,
  createServiceSchedule,
  updateServiceSchedule,
  deleteServiceSchedule,
  reorderServiceSchedules,
} from '../services/service-schedule.service.js'

async function getPublicServiceSchedulesController(req, res, next) {
  try {
    const items = await getPublicServiceSchedules()

    return res.status(200).json({
      status: 'success',
      message: 'Daftar jadwal ibadah berhasil diambil.',
      data: items,
    })
  } catch (error) {
    next(error)
  }
}

async function getAdminServiceSchedulesController(req, res, next) {
  try {
    const items = await getAdminServiceSchedules()

    return res.status(200).json({
      status: 'success',
      message: 'Daftar jadwal ibadah berhasil diambil.',
      data: items,
    })
  } catch (error) {
    next(error)
  }
}

async function createServiceScheduleController(req, res, next) {
  try {
    const item = await createServiceSchedule(req.body, req)

    return res.status(201).json({
      status: 'success',
      message: 'Jadwal ibadah berhasil dibuat.',
      data: item,
    })
  } catch (error) {
    next(error)
  }
}

async function updateServiceScheduleController(req, res, next) {
  try {
    const item = await updateServiceSchedule(req.params.id, req.body, req)

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal ibadah tidak ditemukan.',
      })
    }

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal ibadah berhasil diperbarui.',
      data: item,
    })
  } catch (error) {
    next(error)
  }
}

async function deleteServiceScheduleController(req, res, next) {
  try {
    const item = await deleteServiceSchedule(req.params.id, req)

    if (!item) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal ibadah tidak ditemukan.',
      })
    }

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal ibadah berhasil dihapus.',
      data: item,
    })
  } catch (error) {
    next(error)
  }
}

async function reorderServiceSchedulesController(req, res, next) {
  try {
    const items = await reorderServiceSchedules(req.body.items, req)

    return res.status(200).json({
      status: 'success',
      message: 'Urutan jadwal ibadah berhasil diperbarui.',
      data: items,
    })
  } catch (error) {
    next(error)
  }
}

export {
  getPublicServiceSchedulesController,
  getAdminServiceSchedulesController,
  createServiceScheduleController,
  updateServiceScheduleController,
  deleteServiceScheduleController,
  reorderServiceSchedulesController,
}
