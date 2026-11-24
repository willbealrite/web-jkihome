import { getCurrentThemes } from '../services/public-theme.service.js'

export async function getCurrentThemesHandler(req, res, next) {
  try {
    const themes = await getCurrentThemes()

    return res.status(200).json({
      status: 'success',
      message: 'Tema gereja saat ini berhasil diambil.',
      data: themes,
    })
  } catch (error) {
    next(error)
  }
}
