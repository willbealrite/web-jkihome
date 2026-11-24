import pool from '../config/database.js'

const ALLOWED_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']

const THEME_CONFIG = {
  annual: {
    table: 'annual_themes',
    entityType: 'annual_theme',
    module: 'THEMES',
    fields: ['year', 'title', 'description', 'bible_verse'],
  },
  monthly: {
    table: 'monthly_themes',
    entityType: 'monthly_theme',
    module: 'THEMES',
    fields: [
      'annual_theme_id',
      'month',
      'title',
      'description',
      'bible_verse',
    ],
  },
}

function getConfig(type) {
  const config = THEME_CONFIG[type]

  if (!config) {
    throw new Error('Jenis tema tidak valid.')
  }

  return config
}

function validateThemeData(type, data, isUpdate = false) {
  const config = getConfig(type)
  const errors = []

  for (const field of config.fields) {
    const value = data[field]

    if (!isUpdate && ['year', 'month', 'title'].includes(field) &&
        (value === undefined || value === null || value === '')) {
      errors.push(`${field} wajib diisi.`)
    }

    if (value === undefined) continue

    if (field === 'title') {
      if (typeof value !== 'string' || !value.trim()) {
        errors.push('title harus berupa teks dan tidak boleh kosong.')
      } else if (value.trim().length > 200) {
        errors.push('title maksimal 200 karakter.')
      }
    }

    if (field === 'description' && value !== null &&
        typeof value !== 'string') {
      errors.push('description harus berupa teks.')
    }

    if (field === 'bible_verse' && value !== null &&
        typeof value !== 'string') {
      errors.push('bible_verse harus berupa teks.')
    }

    if (field === 'year' &&
        (!Number.isInteger(value) || value < 2000 || value > 9999)) {
      errors.push('year harus berupa angka antara 2000 dan 9999.')
    }

    if (field === 'month' &&
        (!Number.isInteger(value) || value < 1 || value > 12)) {
      errors.push('month harus berupa angka antara 1 dan 12.')
    }

    if (field === 'annual_theme_id' &&
        (typeof value !== 'string' || !value.trim())) {
      errors.push('annual_theme_id tidak valid.')
    }
  }

  if (data.status !== undefined &&
      !ALLOWED_STATUSES.includes(data.status)) {
    errors.push('status tema tidak valid.')
  }

  if (data.status === 'SCHEDULED' &&
      !data.scheduled_at) {
    errors.push('scheduled_at wajib diisi untuk tema terjadwal.')
  }

  if (data.scheduled_at !== undefined &&
      data.scheduled_at !== null &&
      Number.isNaN(Date.parse(data.scheduled_at))) {
    errors.push('scheduled_at harus berupa tanggal dan waktu yang valid.')
  }

  return errors
}

function getRequestMetadata(req) {
  return {
    adminId: req.admin?.id,
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  }
}

async function writeActivityLog(client, {
  adminId,
  action,
  config,
  entityId,
  description,
  metadata,
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
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
    `,
    [
      adminId,
      action,
      config.module,
      config.entityType,
      entityId,
      description,
      JSON.stringify(metadata),
      ipAddress,
      userAgent,
    ],
  )
}

export async function getThemes(type) {
  const config = getConfig(type)

  const result = await pool.query(
    `
      SELECT *
      FROM public.${config.table}
      ORDER BY ${
        type === 'annual'
          ? 'year DESC'
          : 'created_at DESC'
      }
    `,
  )

  return result.rows
}

export async function getThemeById(type, id) {
  const config = getConfig(type)

  const result = await pool.query(
    `
      SELECT *
      FROM public.${config.table}
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  )

  return result.rows[0] || null
}

export async function createTheme(type, data, req) {
  const config = getConfig(type)
  const errors = validateThemeData(type, data)

  if (errors.length) {
    const error = new Error('Data tema tidak valid.')
    error.statusCode = 400
    error.details = errors
    throw error
  }

  const fields = [...config.fields]
  const values = fields.map((field) =>
    field === 'title' ? data[field].trim() : data[field] ?? null,
  )

  const status = data.status || 'DRAFT'
  const scheduledAt = data.scheduled_at || null
  const publishedAt =
    status === 'PUBLISHED' ? new Date() : null

  fields.push('status', 'scheduled_at', 'published_at')
  values.push(status, scheduledAt, publishedAt)

  const placeholders = values.map((_, index) => `$${index + 1}`)

  const metadata = getRequestMetadata(req)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `
        INSERT INTO public.${config.table} (
          ${fields.join(', ')}
        )
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `,
      values,
    )

    const theme = result.rows[0]

    await writeActivityLog(client, {
      ...metadata,
      action: 'THEME_CREATED',
      config,
      entityId: theme.id,
      description: 'Admin membuat tema baru.',
      metadata: {
        status: theme.status,
        title: theme.title,
      },
    })

    await client.query('COMMIT')

    return theme
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function updateTheme(type, id, data, req) {
  const config = getConfig(type)
  const errors = validateThemeData(type, data, true)

  if (errors.length) {
    const error = new Error('Data tema tidak valid.')
    error.statusCode = 400
    error.details = errors
    throw error
  }

  const fields = config.fields.filter(
    (field) => data[field] !== undefined,
  )

  if (data.status !== undefined) fields.push('status')
  if (data.scheduled_at !== undefined) fields.push('scheduled_at')

  if (fields.length === 0) {
    const error = new Error('Tidak ada data tema yang diperbarui.')
    error.statusCode = 400
    throw error
  }

  const metadata = getRequestMetadata(req)
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const currentResult = await client.query(
      `
        SELECT *
        FROM public.${config.table}
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    const currentTheme = currentResult.rows[0]

    if (!currentTheme) {
      const error = new Error('Tema tidak ditemukan.')
      error.statusCode = 404
      throw error
    }

    if (currentTheme.status === 'ARCHIVED') {
      const error = new Error('Tema yang sudah diarsipkan tidak dapat diubah.')
      error.statusCode = 409
      throw error
    }

    const assignments = []
    const values = []

    for (const field of fields) {
      values.push(
        field === 'title' && data[field] !== undefined
          ? data[field].trim()
          : data[field],
      )
      assignments.push(`${field} = $${values.length}`)
    }

    const nextStatus = data.status ?? currentTheme.status

    if (data.status === 'PUBLISHED' &&
        currentTheme.status !== 'PUBLISHED') {
      values.push(new Date())
      assignments.push(`published_at = $${values.length}`)
    }

    if (data.status && data.status !== 'PUBLISHED') {
      assignments.push('published_at = NULL')
    }

    if (nextStatus === 'SCHEDULED' &&
        !(data.scheduled_at ?? currentTheme.scheduled_at)) {
      const error = new Error('Tema terjadwal wajib memiliki scheduled_at.')
      error.statusCode = 400
      throw error
    }

    values.push(id)

    const result = await client.query(
      `
        UPDATE public.${config.table}
        SET ${assignments.join(', ')}
        WHERE id = $${values.length}
        RETURNING *
      `,
      values,
    )

    const updatedTheme = result.rows[0]

    await writeActivityLog(client, {
      ...metadata,
      action: 'THEME_UPDATED',
      config,
      entityId: id,
      description: 'Admin memperbarui tema.',
      metadata: {
        previous_status: currentTheme.status,
        new_status: updatedTheme.status,
        changed_fields: fields,
      },
    })

    await client.query('COMMIT')

    return updatedTheme
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
