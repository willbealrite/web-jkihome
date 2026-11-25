import pool from '../config/database.js'

// ==================================================
// 1. CONSTANTS
// ==================================================

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// ==================================================
// 2. ERROR HANDLER
// ==================================================

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode

  return error
}

// ==================================================
// 3. DATE VALIDATION
// ==================================================

function validateDate(value, fieldName) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    throw createError(`${fieldName} harus menggunakan format YYYY-MM-DD`, 422)
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!isValid) {
    throw createError(`${fieldName} bukan tanggal yang valid`, 422)
  }

  return value
}

// ==================================================
// 4. PAGINATION VALIDATION
// ==================================================

function validatePagination(query = {}) {
  const pageValue = query.page ?? '1'
  const limitValue = query.limit ?? '10'

  if (
    typeof pageValue !== 'string' ||
    !/^\d+$/.test(pageValue) ||
    typeof limitValue !== 'string' ||
    !/^\d+$/.test(limitValue)
  ) {
    throw createError('Page dan limit harus berupa bilangan bulat positif', 422)
  }

  const page = Number(pageValue)
  const limit = Number(limitValue)

  if (!Number.isSafeInteger(page) || page < 1) {
    throw createError('Page minimal bernilai 1', 422)
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw createError('Limit harus berada di antara 1 sampai 50', 422)
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit
  }
}

// ==================================================
// 5. DATE RANGE VALIDATION
// ==================================================

function validateDateRange(query = {}) {
  const from = query.from
    ? validateDate(query.from, 'from')
    : null

  const to = query.to
    ? validateDate(query.to, 'to')
    : null

  if (from && to && from > to) {
    throw createError('Tanggal from tidak boleh lebih besar dari tanggal to', 422)
  }

  return { from, to }
}

// ==================================================
// 6. GET TODAY DEVOTIONAL
// ==================================================

export async function getTodayDevotional() {
  const result = await pool.query(
    `
      SELECT
        id,
        monthly_theme_id,
        title,
        slug,
        date,
        bible_verse,
        content,
        reflection,
        prayer,
        published_at
      FROM public.devotionals
      WHERE status = 'PUBLISHED'
        AND date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
      LIMIT 1
    `
  )

  return result.rows[0] ?? null
}

// ==================================================
// 7. GET PUBLIC DEVOTIONAL LIST
// ==================================================

export async function getPublicDevotionals(query = {}) {
  const { page, limit, offset } = validatePagination(query)
  const { from, to } = validateDateRange(query)

  const conditions = ["status = 'PUBLISHED'"]
  const values = []

  if (from) {
    values.push(from)
    conditions.push(`date >= $${values.length}`)
  }

  if (to) {
    values.push(to)
    conditions.push(`date <= $${values.length}`)
  }

  const whereClause = conditions.join(' AND ')

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.devotionals
      WHERE ${whereClause}
    `,
    values
  )

  const total = countResult.rows[0].total

  values.push(limit)
  const limitPlaceholder = `$${values.length}`

  values.push(offset)
  const offsetPlaceholder = `$${values.length}`

  const result = await pool.query(
    `
      SELECT
        id,
        title,
        slug,
        date,
        bible_verse,
        published_at
      FROM public.devotionals
      WHERE ${whereClause}
      ORDER BY date DESC
      LIMIT ${limitPlaceholder}
      OFFSET ${offsetPlaceholder}
    `,
    values
  )

  return {
    data: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  }
}

// ==================================================
// 8. GET PUBLIC DEVOTIONAL DETAIL BY SLUG
// ==================================================

export async function getPublicDevotionalBySlug(slug) {
  if (
    typeof slug !== 'string' ||
    slug.length > 220 ||
    !SLUG_REGEX.test(slug)
  ) {
    throw createError('Slug devotional tidak valid', 422)
  }

  const result = await pool.query(
    `
      SELECT
        id,
        monthly_theme_id,
        title,
        slug,
        date,
        bible_verse,
        content,
        reflection,
        prayer,
        published_at
      FROM public.devotionals
      WHERE slug = $1
        AND status = 'PUBLISHED'
      LIMIT 1
    `,
    [slug]
  )

  if (result.rows.length === 0) {
    throw createError('Renungan harian tidak ditemukan', 404)
  }

  return result.rows[0]
}
