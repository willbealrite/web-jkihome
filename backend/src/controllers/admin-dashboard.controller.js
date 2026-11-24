import { getDashboardData } from '../services/admin-dashboard.service.js'

export async function getDashboard(req, res, next) {
  try {
    const data = await getDashboardData()

    return res.status(200).json({
      status: 'success',
      message: 'Dashboard data berhasil diambil.',
      data,
    })
  } catch (error) {
    next(error)
  }
}
