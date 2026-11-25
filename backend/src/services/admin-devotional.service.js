import pool from '../config/database.js'

const ALLOWED_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

const MAX_TITLE_LENGTH = 200
const MAX_SLUG_LENGTH = 220
const MAX_BIBLE_VERSE_LENGTH = 255


// -----------------------------------------------------
// 1. Common Helpers
// -----------------------------------------------------

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode

  return error
}

function validateDate(value, field = 'date') {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) {
    throw createError(
      `Field ${field} harus menggunakan format YYYY-MM-DD.`,
      422,
    )
  }

  const [year, month, day] = value.split('-').map(Number)

  const date = new Date(Date.UTC(year, month - 1, day))

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!isValid) {
    throw createError(
      `Field ${field} bukan tanggal kalender yang valid.`,
      422,
    )
  }

  return value
}

function validateUUID(value, field) {
  if (typeof value !== 'string' || !UUID_REGEX.test(value)) {
    throw createError(
      `Field ${field} harus berupa UUID yang valid.`,
      422,
    )
  }

  return value
}

function validateText(value, field, maxLength, required = true) {
  if (value === undefined || value === null) {
    if (required) {
      throw createError(`Field ${field} wajib diisi.`, 422)
    }

    return null
  }

  if (typeof value !== 'string') {
    throw createError(`Field ${field} harus berupa teks.`, 422)
  }

  if (value.trim() === '') {
    if (!required && value === '') {
      return null
    }

    throw createError(`Field ${field} tidak boleh kosong.`, 422)
  }

  const trimmedValue = value.trim()

  if (trimmedValue.length > maxLength) {
    throw createError(
      `Field ${field} maksimal ${maxLength} karakter.`,
      422,
    )
  }

  return trimmedValue
}

function validateStatus(status) {
  if (
    typeof status !== 'string' ||
    !ALLOWED_STATUSES.includes(status)
  ) {
    throw createError(
      `Status harus salah satu dari: ${ALLOWED_STATUSES.join(', ')}.`,
      422,
    )
  }

  return status
}

function validatePagination(query) {
  const page = Number(query.page ?? 1)
  const limit = Number(query.limit ?? 10)

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50
  ) {
    throw createError(
      'page minimal 1 dan limit harus antara 1 sampai 50.',
      422,
    )
  }

  return { page, limit }
}

function validateDateRange(from, to) {
  if (from !== undefined) {
    validateDate(from, 'from')
  }

  if (to !== undefined) {
    validateDate(to, 'to')
  }

  if (from && to && from > to) {
    throw createError(
      'Tanggal from tidak boleh melebihi tanggal to.',
      422,
    )
  }
}

function getRequestMetadata(req) {
  return {
    adminId: req.admin?.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get?.('user-agent') ?? null,
  }
}


// -----------------------------------------------------
// 2. Slug Generator
// -----------------------------------------------------

function slugify(value) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'devotional'
}

function buildSlug(baseSlug, suffix = '') {
  const suffixText = suffix ? `-${suffix}` : ''
  const availableLength = MAX_SLUG_LENGTH - suffixText.length

  const truncatedBase = baseSlug
    .slice(0, availableLength)
    .replace(/-+$/g, '')

  return `${truncatedBase}${suffixText}`
}


// -----------------------------------------------------
// 3. Scheduling Validation
// Uses PostgreSQL Database Time
// -----------------------------------------------------

function validateScheduledAt(value, databaseTime) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createError(
      'scheduled_at wajib diisi untuk status SCHEDULED.',
      422,
    )
  }

  const hasTimezone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value)

  if (!hasTimezone) {
    throw createError(
      'scheduled_at harus menyertakan timezone, misalnya +07:00 atau Z.',
      422,
    )
  }

  const timestamp = Date.parse(value)

  if (Number.isNaN(timestamp)) {
    throw createError(
      'Format scheduled_at tidak valid.',
      422,
    )
  }

  const databaseTimestamp = new Date(databaseTime).getTime()

  if (timestamp <= databaseTimestamp) {
    throw createError(
      'scheduled_at harus berada di masa depan.',
      422,
    )
  }

  return new Date(timestamp).toISOString()
}


// -----------------------------------------------------
// 4. Activity Log Helper
// -----------------------------------------------------

async function writeActivityLog(client, {
  adminId,
  action,
  entityId,
  description,
  metadata = {},
  ipAddress,
  userAgent,
}) {
  await client.query(
    `
      INSERT INTO public.admin_activity_logs (
        admin_id,
        action,
        module,
        entity_type,
        entity_id,
        description,
        metadata,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, 'DEVOTIONALS', 'devotional', $3, $4, $5, $6, $7)
    `,
    [
      adminId,
      action,
      entityId,
      description,
      JSON.stringify(metadata),
      ipAddress,
      userAgent,
    ],
  )
}


// -----------------------------------------------------
// 5. Database Error Handler
// -----------------------------------------------------

function handleDatabaseError(error) {
  if (
    error.code === '23505' &&
    error.constraint === 'devotionals_date_unique'
  ) {
    return createError(
      'Sudah ada devotional untuk tanggal tersebut.',
      409,
    )
  }

  if (error.code === '23503') {
    return createError(
      'Monthly Theme yang dipilih tidak ditemukan.',
      422,
    )
  }

  return error
}


// -----------------------------------------------------
// 6. Admin Devotional List
// GET /api/v1/admin/devotionals
// -----------------------------------------------------

export async function getAdminDevotionals(query = {}) {
  const { page, limit } = validatePagination(query)

  const offset = (page - 1) * limit

  validateDateRange(query.from, query.to)

  const conditions = []
  const values = []

  function addCondition(sql, value) {
    values.push(value)
    conditions.push(
      sql.replace('?', `$${values.length}`),
    )
  }

  if (query.status !== undefined) {
    addCondition(
      'status = ?',
      validateStatus(query.status),
    )
  }

  if (query.from !== undefined) {
    addCondition('date >= ?::date', query.from)
  }

  if (query.to !== undefined) {
    addCondition('date <= ?::date', query.to)
  }

  if (query.monthly_theme_id !== undefined) {
    addCondition(
      'monthly_theme_id = ?::uuid',
      validateUUID(
        query.monthly_theme_id,
        'monthly_theme_id',
      ),
    )
  }

  if (query.search !== undefined) {
    const search = validateText(
      query.search,
      'search',
      MAX_TITLE_LENGTH,
    )

    addCondition(
      'title ILIKE ?',
      `%${search}%`,
    )
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : ''

  const countResult = await pool.query(
    `
      SELECT COUNT(*)::int AS total
      FROM public.devotionals
      ${whereClause}
    `,
    values,
  )

  const total = countResult.rows[0].total

  const dataResult = await pool.query(
    `
      SELECT
        id,
        monthly_theme_id,
        title,
        slug,
        date,
        bible_verse,
        status,
        scheduled_at,
        published_at,
        created_at,
        updated_at
      FROM public.devotionals
      ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `,
    [...values, limit, offset],
  )

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}


// -----------------------------------------------------
// 7. Admin Devotional Detail
// GET /api/v1/admin/devotionals/:id
// -----------------------------------------------------

export async function getAdminDevotionalById(id) {
  validateUUID(id, 'id')

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
        status,
        scheduled_at,
        published_at,
        created_at,
        updated_at
      FROM public.devotionals
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  if (result.rowCount === 0) {
    throw createError(
      'Devotional tidak ditemukan.',
      404,
    )
  }

  return result.rows[0]
}


// -----------------------------------------------------
// 8. Admin Devotional Create
// POST /api/v1/admin/devotionals
// New Devotional Always DRAFT
// -----------------------------------------------------

export async function createAdminDevotional(body, req) {
  const monthlyThemeId =
    body.monthly_theme_id === undefined ||
    body.monthly_theme_id === null
      ? null
      : validateUUID(
          body.monthly_theme_id,
          'monthly_theme_id',
        )

  const title = validateText(
    body.title,
    'title',
    MAX_TITLE_LENGTH,
  )

  const date = validateDate(body.date)

  const bibleVerse = validateText(
    body.bible_verse,
    'bible_verse',
    MAX_BIBLE_VERSE_LENGTH,
  )

  const content = validateText(
    body.content,
    'content',
    Number.MAX_SAFE_INTEGER,
  )

  const reflection = validateText(
    body.reflection,
    'reflection',
    Number.MAX_SAFE_INTEGER,
    false,
  )

  const prayer = validateText(
    body.prayer,
    'prayer',
    Number.MAX_SAFE_INTEGER,
    false,
  )

  const metadata = getRequestMetadata(req)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const baseSlug = slugify(title)

    let createdDevotional = null

    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const slug = buildSlug(
        baseSlug,
        attempt === 1 ? '' : attempt,
      )

      await client.query(
        'SAVEPOINT devotional_insert_attempt',
      )

      try {
        const result = await client.query(
          `
            INSERT INTO public.devotionals (
              monthly_theme_id,
              title,
              slug,
              date,
              bible_verse,
              content,
              reflection,
              prayer,
              status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'DRAFT')
            RETURNING *
          `,
          [
            monthlyThemeId,
            title,
            slug,
            date,
            bibleVerse,
            content,
            reflection,
            prayer,
          ],
        )

        createdDevotional = result.rows[0]

        await client.query(
          'RELEASE SAVEPOINT devotional_insert_attempt',
        )

        break
      } catch (error) {
        await client.query(
          'ROLLBACK TO SAVEPOINT devotional_insert_attempt',
        )

        await client.query(
          'RELEASE SAVEPOINT devotional_insert_attempt',
        )

        if (
          error.code === '23505' &&
          error.constraint === 'devotionals_slug_key'
        ) {
          continue
        }

        throw error
      }
    }

    if (!createdDevotional) {
      throw createError(
        'Gagal menghasilkan slug unik untuk devotional.',
        409,
      )
    }

    await writeActivityLog(client, {
      ...metadata,
      action: 'DEVOTIONAL_CREATED',
      entityId: createdDevotional.id,
      description: `Membuat devotional "${title}".`,
      metadata: {
        title,
        slug: createdDevotional.slug,
        date,
        status: 'DRAFT',
      },
    })

    await client.query('COMMIT')

    return createdDevotional
  } catch (error) {
    await client.query('ROLLBACK')

    throw handleDatabaseError(error)
  } finally {
    client.release()
  }
}


// -----------------------------------------------------
// 9. Admin Devotional Update
// PATCH /api/v1/admin/devotionals/:id
// -----------------------------------------------------

export async function updateAdminDevotional(id, body, req) {
  validateUUID(id, 'id')

  const allowedFields = [
    'monthly_theme_id',
    'title',
    'date',
    'bible_verse',
    'content',
    'reflection',
    'prayer',
    'status',
    'scheduled_at',
  ]

  const suppliedFields = Object.keys(body)

  if (suppliedFields.length === 0) {
    throw createError(
      'Tidak ada field yang dikirim untuk diperbarui.',
      422,
    )
  }

  const unknownFields = suppliedFields.filter(
    (field) => !allowedFields.includes(field),
  )

  if (unknownFields.length > 0) {
    throw createError(
      `Field tidak dikenal: ${unknownFields.join(', ')}.`,
      422,
    )
  }

  const metadata = getRequestMetadata(req)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query(
      `
        SELECT *
        FROM public.devotionals
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (currentResult.rowCount === 0) {
      throw createError(
        'Devotional tidak ditemukan.',
        404,
      )
    }

    const current = currentResult.rows[0]

    if (current.status === 'ARCHIVED') {
      throw createError(
        'Devotional yang sudah ARCHIVED tidak dapat diperbarui.',
        409,
      )
    }

    // Ambil waktu database agar konsisten
    // dengan scheduler dan PostgreSQL.

    const clockResult = await client.query(
      'SELECT NOW() AS database_time',
    )

    const databaseTime = clockResult.rows[0].database_time

    const updated = {
      monthly_theme_id: current.monthly_theme_id,
      title: current.title,
      date: current.date,
      bible_verse: current.bible_verse,
      content: current.content,
      reflection: current.reflection,
      prayer: current.prayer,
    }

    if (Object.hasOwn(body, 'monthly_theme_id')) {
      updated.monthly_theme_id =
        body.monthly_theme_id === null
          ? null
          : validateUUID(
              body.monthly_theme_id,
              'monthly_theme_id',
            )
    }

    if (Object.hasOwn(body, 'title')) {
      updated.title = validateText(
        body.title,
        'title',
        MAX_TITLE_LENGTH,
      )
    }

    if (Object.hasOwn(body, 'date')) {
      updated.date = validateDate(body.date)
    }

    if (Object.hasOwn(body, 'bible_verse')) {
      updated.bible_verse = validateText(
        body.bible_verse,
        'bible_verse',
        MAX_BIBLE_VERSE_LENGTH,
      )
    }

    if (Object.hasOwn(body, 'content')) {
      updated.content = validateText(
        body.content,
        'content',
        Number.MAX_SAFE_INTEGER,
      )
    }

    if (Object.hasOwn(body, 'reflection')) {
      updated.reflection = validateText(
        body.reflection,
        'reflection',
        Number.MAX_SAFE_INTEGER,
        false,
      )
    }

    if (Object.hasOwn(body, 'prayer')) {
      updated.prayer = validateText(
        body.prayer,
        'prayer',
        Number.MAX_SAFE_INTEGER,
        false,
      )
    }

    const newStatus = Object.hasOwn(body, 'status')
      ? validateStatus(body.status)
      : current.status

    const statusChanged = newStatus !== current.status

    // PUBLISHED tidak boleh kembali ke DRAFT atau SCHEDULED.

    if (
      current.status === 'PUBLISHED' &&
      (newStatus === 'DRAFT' || newStatus === 'SCHEDULED')
    ) {
      throw createError(
        'Devotional PUBLISHED tidak dapat diubah kembali menjadi DRAFT atau SCHEDULED.',
        409,
      )
    }

    // ARCHIVED merupakan status terminal.

    if (Object.hasOwn(body, 'scheduled_at') && newStatus !== 'SCHEDULED') {
      throw createError(
        'scheduled_at hanya boleh dikirim ketika status SCHEDULED.',
        422,
      )
    }

    let scheduledAt = current.scheduled_at
    let publishedAt = current.published_at

    if (newStatus === 'SCHEDULED') {
      if (Object.hasOwn(body, 'scheduled_at')) {
        scheduledAt = validateScheduledAt(
          body.scheduled_at,
          databaseTime,
        )
      } else if (statusChanged) {
        throw createError(
          'scheduled_at wajib diisi untuk status SCHEDULED.',
          422,
        )
      } else {
        if (!scheduledAt) {
          throw createError(
            'scheduled_at wajib diisi untuk status SCHEDULED.',
            422,
          )
        }

        if (
          new Date(scheduledAt).getTime() <=
          new Date(databaseTime).getTime()
        ) {
          throw createError(
            'Jadwal yang sudah lewat tidak dapat dipertahankan sebagai SCHEDULED.',
            422,
          )
        }
      }

      publishedAt = null
    } else if (newStatus === 'PUBLISHED') {
      scheduledAt = null

      if (statusChanged) {
        publishedAt = null
      }
    } else if (newStatus === 'DRAFT') {
      scheduledAt = null
      publishedAt = null
    } else if (newStatus === 'ARCHIVED') {
      scheduledAt = null
    }

    const result = await client.query(
      `
        UPDATE public.devotionals
        SET
          monthly_theme_id = $1,
          title = $2,
          date = $3,
          bible_verse = $4,
          content = $5,
          reflection = $6,
          prayer = $7,
          status = $8,
          scheduled_at = $9,
          published_at = CASE
            WHEN $10 = TRUE THEN NOW()
            ELSE $11
          END
        WHERE id = $12
        RETURNING *
      `,
      [
        updated.monthly_theme_id,
        updated.title,
        updated.date,
        updated.bible_verse,
        updated.content,
        updated.reflection,
        updated.prayer,
        newStatus,
        scheduledAt,
        statusChanged && newStatus === 'PUBLISHED',
        publishedAt,
        id,
      ],
    )

    const updatedDevotional = result.rows[0]

    let action = 'DEVOTIONAL_UPDATED'

    if (statusChanged) {
      if (newStatus === 'SCHEDULED') {
        action = 'DEVOTIONAL_SCHEDULED'
      } else if (newStatus === 'PUBLISHED') {
        action = 'DEVOTIONAL_PUBLISHED'
      } else if (newStatus === 'ARCHIVED') {
        action = 'DEVOTIONAL_ARCHIVED'
      }
    }

    await writeActivityLog(client, {
      ...metadata,
      action,
      entityId: id,
      description: statusChanged
        ? `Mengubah status devotional "${updatedDevotional.title}" dari ${current.status} menjadi ${newStatus}.`
        : `Memperbarui devotional "${updatedDevotional.title}".`,
      metadata: {
        previous_status: current.status,
        new_status: newStatus,
        changed_fields: suppliedFields,
        date: updatedDevotional.date,
      },
    })

    await client.query('COMMIT')

    return updatedDevotional
  } catch (error) {
    await client.query('ROLLBACK')

    throw handleDatabaseError(error)
  } finally {
    client.release()
  }
}
