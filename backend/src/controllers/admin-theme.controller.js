import {
  getThemes,
  getThemeById,
  createTheme,
  updateTheme,
} from '../services/admin-theme.service.js'

function handleError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
      ...(error.details ? { errors: error.details } : {}),
    })
  }

  if (error.code === '23505') {
    return res.status(409).json({
      status: 'error',
      message: 'Tema untuk periode tersebut sudah tersedia.',
    })
  }

  if (error.code === '23503') {
    return res.status(400).json({
      status: 'error',
      message: 'Referensi tema tahunan tidak ditemukan.',
    })
  }

  return next(error)
}

export async function listThemes(req, res, next) {
  try {
    const themes = await getThemes(req.params.type)

    return res.status(200).json({
      status: 'success',
      message: 'Daftar tema berhasil diambil.',
      data: themes,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
}

export async function getThemeDetail(req, res, next) {
  try {
    const theme = await getThemeById(req.params.type, req.params.id)

    if (!theme) {
      return res.status(404).json({
        status: 'error',
        message: 'Tema tidak ditemukan.',
      })
    }

    return res.status(200).json({
      status: 'success',
      message: 'Detail tema berhasil diambil.',
      data: theme,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
}

export async function createThemeHandler(req, res, next) {
  try {
    const theme = await createTheme(
      req.params.type,
      req.body,
      req,
    )

    return res.status(201).json({
      status: 'success',
      message: 'Tema berhasil dibuat.',
      data: theme,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
}

export async function updateThemeHandler(req, res, next) {
  try {
    const theme = await updateTheme(
      req.params.type,
      req.params.id,
      req.body,
      req,
    )

    return res.status(200).json({
      status: 'success',
      message: 'Tema berhasil diperbarui.',
      data: theme,
    })
  } catch (error) {
    return handleError(error, res, next)
  }
}
