import multer from 'multer'

// -----------------------------------------------------
// 1. Error Handler
// -----------------------------------------------------

function errorHandler(err, req, res, next) {
  // Delegate to Express if response headers have already been sent
  if (res.headersSent) {
    return next(err)
  }

  // ---------------------------------------------------
  // 2. Normalize Upload Errors
  // ---------------------------------------------------

  if (err instanceof multer.MulterError) {
    err.statusCode =
      err.code === 'LIMIT_FILE_SIZE'
        ? 413
        : 400

    if (err.code === 'LIMIT_FILE_SIZE') {
      err.message = 'Ukuran file melebihi batas 5 MB.'
    } else {
      err.message = 'Permintaan upload file tidak valid.'
    }
  }

  // ---------------------------------------------------
  // 3. Determine HTTP Status Code
  // ---------------------------------------------------

  const requestedStatus = err.statusCode ?? err.status

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500

  // ---------------------------------------------------
  // 4. Safe Response Message
  // ---------------------------------------------------

  const message =
    statusCode >= 500
      ? 'Terjadi kesalahan pada server.'
      : err.message || 'Permintaan tidak dapat diproses.'

  // ---------------------------------------------------
  // 5. Server Logging
  // ---------------------------------------------------

  console.error('[API ERROR]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message: err.message,
    stack: err.stack,
  })

  // ---------------------------------------------------
  // 6. Response
  // ---------------------------------------------------

  return res.status(statusCode).json({
    status: 'error',
    message,
  })
}

// -----------------------------------------------------
// 7. Export
// -----------------------------------------------------

export default errorHandler
