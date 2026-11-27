const ALLOWED_STATUSES = ['ACTIVE', 'DELETE_PENDING']
const ALLOWED_RESOURCE_TYPES = ['IMAGE', 'RAW']
const ALLOWED_SORT_FIELDS = ['created_at', 'file_name', 'file_size']
const ALLOWED_ORDERS = ['asc', 'desc']
const ALLOWED_QUERY_FIELDS = [
  'page',
  'limit',
  'search',
  'status',
  'resource_type',
  'sort_by',
  'order',
]

const MAX_PAGE = 1_000_000
const MAX_LIMIT = 100

// -----------------------------------------------------
// 1. Media Listing Query Validation
// -----------------------------------------------------

function validateMediaListingQuery(req, res, next) {
  const errors = []
  const query = req.query

  // ---------------------------------------------------
  // 2. Validate Unknown Query Parameters
  // ---------------------------------------------------

  for (const field of Object.keys(query)) {
    if (!ALLOWED_QUERY_FIELDS.includes(field)) {
      errors.push({
        field,
        message: `${field} tidak dikenal.`,
      })
    }
  }

  // ---------------------------------------------------
  // 3. Validate Pagination
  // ---------------------------------------------------

  function parsePositiveInteger(field, defaultValue, maxValue) {
    const value = query[field]

    if (value === undefined) {
      return defaultValue
    }

    if (
      typeof value !== 'string' ||
      !/^\d+$/.test(value)
    ) {
      errors.push({
        field,
        message: `${field} harus berupa angka integer yang valid.`,
      })

      return defaultValue
    }

    const parsedValue = Number(value)

    if (
      !Number.isSafeInteger(parsedValue) ||
      parsedValue < 1 ||
      parsedValue > maxValue
    ) {
      errors.push({
        field,
        message: `${field} harus antara 1 dan ${maxValue}.`,
      })

      return defaultValue
    }

    return parsedValue
  }

  const page = parsePositiveInteger('page', 1, MAX_PAGE)
  const limit = parsePositiveInteger('limit', 20, MAX_LIMIT)

  // ---------------------------------------------------
  // 4. Validate Search
  // ---------------------------------------------------

  let search = undefined

  if (query.search !== undefined) {
    if (
      typeof query.search !== 'string' ||
      query.search.trim().length > 100
    ) {
      errors.push({
        field: 'search',
        message: 'search harus berupa teks maksimal 100 karakter.',
      })
    } else {
      search = query.search.trim() || undefined
    }
  }

  // ---------------------------------------------------
  // 5. Validate Status
  // ---------------------------------------------------

  let status = undefined

  if (query.status !== undefined) {
    if (
      typeof query.status !== 'string' ||
      !ALLOWED_STATUSES.includes(query.status)
    ) {
      errors.push({
        field: 'status',
        message: 'status harus ACTIVE atau DELETE_PENDING.',
      })
    } else {
      status = query.status
    }
  }

  // ---------------------------------------------------
  // 6. Validate Resource Type
  // ---------------------------------------------------

  let resourceType = undefined

  if (query.resource_type !== undefined) {
    if (
      typeof query.resource_type !== 'string' ||
      !ALLOWED_RESOURCE_TYPES.includes(query.resource_type)
    ) {
      errors.push({
        field: 'resource_type',
        message: 'resource_type harus IMAGE atau RAW.',
      })
    } else {
      resourceType = query.resource_type
    }
  }

  // ---------------------------------------------------
  // 7. Validate Sorting
  // ---------------------------------------------------

  const sortBy = query.sort_by ?? 'created_at'
  const order = query.order ?? 'desc'

  if (
    typeof sortBy !== 'string' ||
    !ALLOWED_SORT_FIELDS.includes(sortBy)
  ) {
    errors.push({
      field: 'sort_by',
      message: 'sort_by tidak valid.',
    })
  }

  if (
    typeof order !== 'string' ||
    !ALLOWED_ORDERS.includes(order)
  ) {
    errors.push({
      field: 'order',
      message: 'order harus asc atau desc.',
    })
  }

  // ---------------------------------------------------
  // 8. Return Validation Errors
  // ---------------------------------------------------

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validasi query Media Listing gagal.',
      errors,
    })
  }

  // ---------------------------------------------------
  // 9. Normalize Query
  // ---------------------------------------------------

  req.mediaQuery = {
    page,
    limit,
    search,
    status,
    resource_type: resourceType,
    sort_by: sortBy,
    order,
  }

  return next()
}

// -----------------------------------------------------
// 10. Export Middleware
// -----------------------------------------------------

export { validateMediaListingQuery }
