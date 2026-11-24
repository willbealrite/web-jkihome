function errorHandler(err, req, res, next) {
  // Delegate to Express if response headers have already been sent
  if (res.headersSent) {
    return next(err)
  }

  // Determine a valid HTTP status code
  const requestedStatus = err.statusCode ?? err.status

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500

  // Prevent internal server error details from leaking to clients
  const message =
    statusCode >= 500
      ? 'Terjadi kesalahan pada server.'
      : err.message || 'Permintaan tidak dapat diproses.'

  // Log error details on the server
  console.error('[API ERROR]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
  })

  return res.status(statusCode).json({
    status: 'error',
    message,
  })
}

export default errorHandler
