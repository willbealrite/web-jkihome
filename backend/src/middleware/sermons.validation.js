// ==================================================
// Sermons Validation Middleware
// ==================================================

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const YOUTUBE_VIDEO_ID_REGEX =
  /^[A-Za-z0-9_-]{11}$/

const createValidationError = (message) => {
  const error = new Error(message)
  error.statusCode = 422
  return error
}

const isPlainObject = (value) =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value)

const rejectUnknownFields = (body, allowedFields) => {
  const unknownFields = Object.keys(body).filter(
    (key) => !allowedFields.includes(key),
  )

  if (unknownFields.length > 0) {
    throw createValidationError(
      `Unknown field(s): ${unknownFields.join(', ')}`,
    )
  }
}

// ==================================================
// 1. Title Validation
// ==================================================

const validateTitle = (title) => {
  if (typeof title !== 'string') {
    throw createValidationError('Title must be a string')
  }

  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    throw createValidationError('Title is required')
  }

  if (trimmedTitle.length > 200) {
    throw createValidationError(
      'Title must not exceed 200 characters',
    )
  }
}

// ==================================================
// 2. YouTube URL Validation
// ==================================================

const extractYouTubeVideoId = (youtubeUrl) => {
  if (typeof youtubeUrl !== 'string') {
    throw createValidationError(
      'youtube_url must be a string',
    )
  }

  const trimmedUrl = youtubeUrl.trim()

  if (!trimmedUrl) {
    throw createValidationError(
      'youtube_url is required',
    )
  }

  let parsedUrl

  try {
    parsedUrl = new URL(trimmedUrl)
  } catch {
    throw createValidationError(
      'Invalid YouTube URL',
    )
  }

  const allowedHosts = [
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'youtu.be',
  ]

  const hostname = parsedUrl.hostname.toLowerCase()

  if (
    !['https:', 'http:'].includes(parsedUrl.protocol) ||
    !allowedHosts.includes(hostname) ||
    parsedUrl.username !== '' ||
    parsedUrl.password !== '' ||
    parsedUrl.port !== ''
  ) {
    throw createValidationError(
      'URL must be a valid YouTube URL',
    )
  }

  let videoId

  // --------------------------------------------------
  // Short URL: https://youtu.be/VIDEO_ID
  // --------------------------------------------------

  if (hostname === 'youtu.be') {
    const pathSegments = parsedUrl.pathname.split('/')

    if (
      pathSegments.length !== 2 ||
      pathSegments[0] !== '' ||
      !pathSegments[1]
    ) {
      throw createValidationError(
        'Invalid YouTube URL path',
      )
    }

    videoId = pathSegments[1]
  }

  // --------------------------------------------------
  // Watch URL: https://youtube.com/watch?v=VIDEO_ID
  // --------------------------------------------------

  else if (parsedUrl.pathname === '/watch') {
    videoId = parsedUrl.searchParams.get('v')
  }

  // --------------------------------------------------
  // Embed / Shorts / Live URL
  // --------------------------------------------------

  else {
    const pathSegments = parsedUrl.pathname.split('/')

    if (
      pathSegments.length === 3 &&
      pathSegments[0] === '' &&
      ['embed', 'shorts', 'live'].includes(pathSegments[1])
    ) {
      videoId = pathSegments[2]
    }
  }

  // --------------------------------------------------
  // Video ID Validation
  // --------------------------------------------------

  if (
    typeof videoId !== 'string' ||
    !YOUTUBE_VIDEO_ID_REGEX.test(videoId)
  ) {
    throw createValidationError(
      'Unable to extract a valid YouTube video ID',
    )
  }

  return videoId
}

// ==================================================
// 3. Preached Date Validation
// ==================================================

const validatePreachedAt = (preachedAt) => {
  if (typeof preachedAt !== 'string') {
    throw createValidationError(
      'preached_at must be a string',
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(preachedAt)) {
    throw createValidationError(
      'preached_at must use YYYY-MM-DD format',
    )
  }

  const [year, month, day] = preachedAt
    .split('-')
    .map(Number)

  // Avoid Date.UTC's special handling of years 0–99.
  const date = new Date(0)

  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  const isValidCalendarDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!isValidCalendarDate) {
    throw createValidationError(
      'preached_at must be a valid calendar date',
    )
  }
}

// ==================================================
// 4. POST Create Validation
// ==================================================

export const validateCreateSermon = (
  req,
  res,
  next,
) => {
  try {
    if (!isPlainObject(req.body)) {
      throw createValidationError(
        'Request body must be an object',
      )
    }

    const allowedFields = [
      'title',
      'youtube_url',
      'preached_at',
    ]

    rejectUnknownFields(req.body, allowedFields)

    for (const field of allowedFields) {
      if (!Object.hasOwn(req.body, field)) {
        throw createValidationError(
          `${field} is required`,
        )
      }
    }

    validateTitle(req.body.title)

    const youtubeVideoId = extractYouTubeVideoId(
      req.body.youtube_url,
    )

    validatePreachedAt(req.body.preached_at)

    req.body.title = req.body.title.trim()
    req.body.youtube_url = req.body.youtube_url.trim()

    // Store extracted video ID for service layer
    req.youtubeVideoId = youtubeVideoId

    next()
  } catch (error) {
    next(error)
  }
}

// ==================================================
// 5. DELETE Validation
// ==================================================

export const validateDeleteSermon = (
  req,
  res,
  next,
) => {
  try {
    if (
      typeof req.params.id !== 'string' ||
      !UUID_REGEX.test(req.params.id)
    ) {
      throw createValidationError(
        'Invalid sermon UUID',
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}
