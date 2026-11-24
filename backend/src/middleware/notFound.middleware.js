function notFoundHandler(req, res, next) {
  const error = new Error(
    `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  )

  error.statusCode = 404

  next(error)
}

export default notFoundHandler
