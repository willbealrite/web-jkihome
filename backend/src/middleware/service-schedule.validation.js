const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

const validateTitle = (title) => {
  if (typeof title !== 'string') {
    throw createValidationError('Title must be a string')
  }

  const trimmedTitle = title.trim()

  if (!trimmedTitle) {
    throw createValidationError('Title is required')
  }

  if (trimmedTitle.length > 200) {
    throw createValidationError('Title must not exceed 200 characters')
  }
}

const validateScheduleInfo = (scheduleInfo) => {
  if (typeof scheduleInfo !== 'string') {
    throw createValidationError('Schedule info must be a string')
  }

  if (!scheduleInfo.trim()) {
    throw createValidationError('Schedule info is required')
  }
}

const validateIsActive = (isActive) => {
  if (typeof isActive !== 'boolean') {
    throw createValidationError('is_active must be a boolean')
  }
}

const validateUUID = (id) => {
  if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
    throw createValidationError('Invalid UUID')
  }
}

// -----------------------------------------------------
// POST Validation
// -----------------------------------------------------

export const validateCreateServiceSchedule = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw createValidationError('Request body must be an object')
    }

    rejectUnknownFields(req.body, ['title', 'schedule_info'])

    if (!Object.hasOwn(req.body, 'title')) {
      throw createValidationError('Title is required')
    }

    if (!Object.hasOwn(req.body, 'schedule_info')) {
      throw createValidationError('Schedule info is required')
    }

    validateTitle(req.body.title)
    validateScheduleInfo(req.body.schedule_info)

    req.body.title = req.body.title.trim()
    req.body.schedule_info = req.body.schedule_info.trim()

    next()
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// PATCH Validation
// -----------------------------------------------------

export const validateUpdateServiceSchedule = (req, res, next) => {
  try {
    validateUUID(req.params.id)

    if (!isPlainObject(req.body)) {
      throw createValidationError('Request body must be an object')
    }

    const allowedFields = ['title', 'schedule_info', 'is_active']

    rejectUnknownFields(req.body, allowedFields)

    const keys = Object.keys(req.body)

    if (keys.length === 0) {
      throw createValidationError('Request body must not be empty')
    }

    if (Object.hasOwn(req.body, 'title')) {
      validateTitle(req.body.title)
      req.body.title = req.body.title.trim()
    }

    if (Object.hasOwn(req.body, 'schedule_info')) {
      validateScheduleInfo(req.body.schedule_info)
      req.body.schedule_info = req.body.schedule_info.trim()
    }

    if (Object.hasOwn(req.body, 'is_active')) {
      validateIsActive(req.body.is_active)
    }

    next()
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// DELETE Validation
// -----------------------------------------------------

export const validateDeleteServiceSchedule = (req, res, next) => {
  try {
    validateUUID(req.params.id)
    next()
  } catch (error) {
    next(error)
  }
}

// -----------------------------------------------------
// REORDER Validation
// -----------------------------------------------------

export const validateReorderServiceSchedules = (req, res, next) => {
  try {
    if (!isPlainObject(req.body)) {
      throw createValidationError('Request body must be an object')
    }

    rejectUnknownFields(req.body, ['items'])

    if (!Array.isArray(req.body.items)) {
      throw createValidationError('Items must be an array')
    }

    const { items } = req.body

    if (items.length === 0) {
      throw createValidationError('Items must not be empty')
    }

    const seenIds = new Set()

    items.forEach((item, index) => {
      if (!isPlainObject(item)) {
        throw createValidationError(
          `Item at index ${index} must be an object`,
        )
      }

      rejectUnknownFields(item, ['id', 'display_order'])

      if (!Object.hasOwn(item, 'id')) {
        throw createValidationError(
          `Item at index ${index} must contain id`,
        )
      }

      if (!Object.hasOwn(item, 'display_order')) {
        throw createValidationError(
          `Item at index ${index} must contain display_order`,
        )
      }

      validateUUID(item.id)

      if (seenIds.has(item.id)) {
        throw createValidationError('Duplicate IDs are not allowed')
      }

      seenIds.add(item.id)

      if (
        !Number.isInteger(item.display_order) ||
        item.display_order < 0
      ) {
        throw createValidationError(
          'display_order must be a nonnegative integer',
        )
      }
    })

    next()
  } catch (error) {
    next(error)
  }
}
