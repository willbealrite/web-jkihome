import pool from '../config/database.js'

// ==================================================
// COMMON HELPERS
// ==================================================

function createError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function slugify(value) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sermon'
  )
}

function buildSlug(baseSlug, suffix = '') {
  const suffixText = suffix ? `-${suffix}` : ''
  const availableLength = 220 - suffixText.length

  const truncatedBase = baseSlug
    .slice(0, availableLength)
    .replace(/-+$/g, '')

  return `${truncatedBase}${suffixText}`
}

async function safeRollback(client) {
  try {
    await client.query('ROLLBACK')
    return null
  } catch (rollbackError) {
    return rollbackError
  }
}

// ==================================================
// ACTIVITY LOG
// ==================================================

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
      VALUES (
        $1, $2, 'SERMONS', 'sermon',
        $3, $4, $5, $6, $7
      )
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

// ==================================================
// PUBLIC SERMONS
// GET /api/v1/sermons
// ==================================================

export async function getPublicSermons() {
  const result = await pool.query(
    `
      SELECT
        id,
        title,
        slug,
        youtube_video_id,
        preached_at,
        published_at,
        created_at
      FROM public.sermons
      WHERE status = 'PUBLISHED'
        AND published_at IS NOT NULL
      ORDER BY preached_at DESC, created_at DESC, id DESC
    `,
  )

  return result.rows
}

// ==================================================
// ADMIN SERMONS
// GET /api/v1/admin/sermons
// ==================================================

export async function getAdminSermons() {
  const result = await pool.query(
    `
      SELECT
        id,
        title,
        slug,
        youtube_video_id,
        preached_at,
        status,
        published_at,
        created_at,
        updated_at
      FROM public.sermons
      ORDER BY preached_at DESC, created_at DESC, id DESC
    `,
  )

  return result.rows
}

// ==================================================
// CREATE SERMON
// POST /api/v1/admin/sermons
// ==================================================

export async function createSermon(body, req) {
  const title = body.title.trim()
  const youtubeVideoId = req.youtubeVideoId
  const preachedAt = body.preached_at

  const client = await pool.connect()
  let releaseError = null

  try {
    await client.query('BEGIN')

    const baseSlug = slugify(title)
    let createdSermon = null

    for (let attempt = 1; attempt <= 100; attempt += 1) {
      const slug = buildSlug(
        baseSlug,
        attempt === 1 ? '' : String(attempt),
      )

      await client.query(
        'SAVEPOINT sermon_insert_attempt',
      )

      try {
        const result = await client.query(
          `
            INSERT INTO public.sermons (
              title,
              slug,
              youtube_video_id,
              preached_at,
              status,
              published_at
            )
            VALUES (
              $1, $2, $3, $4,
              'PUBLISHED', NOW()
            )
            RETURNING *
          `,
          [
            title,
            slug,
            youtubeVideoId,
            preachedAt,
          ],
        )

        createdSermon = result.rows[0]

        await client.query(
          'RELEASE SAVEPOINT sermon_insert_attempt',
        )

        break
      } catch (error) {
        await client.query(
          'ROLLBACK TO SAVEPOINT sermon_insert_attempt',
        )

        await client.query(
          'RELEASE SAVEPOINT sermon_insert_attempt',
        )

        if (
          error.code === '23505' &&
          error.constraint === 'sermons_slug_key'
        ) {
          continue
        }

        throw error
      }
    }

    if (!createdSermon) {
      throw createError(
        'Gagal menghasilkan slug unik untuk sermon.',
        409,
      )
    }

    await writeActivityLog(client, {
      adminId: req.admin.id,
      action: 'SERMON_CREATED',
      entityId: createdSermon.id,
      description: `Admin menambahkan sermon "${title}".`,
      metadata: {
        title,
        slug: createdSermon.slug,
        youtube_video_id: youtubeVideoId,
        preached_at: preachedAt,
        status: 'PUBLISHED',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    await client.query('COMMIT')

    return createdSermon
  } catch (error) {
    releaseError = await safeRollback(client)
    throw error
  } finally {
    client.release(releaseError || undefined)
  }
}

// ==================================================
// DELETE SERMON
// DELETE /api/v1/admin/sermons/:id
// ==================================================

export async function deleteSermon(id, req) {
  const client = await pool.connect()
  let releaseError = null

  try {
    await client.query('BEGIN')

    const existingResult = await client.query(
      `
        SELECT *
        FROM public.sermons
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (existingResult.rowCount === 0) {
      throw createError(
        'Sermon tidak ditemukan.',
        404,
      )
    }

    const sermon = existingResult.rows[0]

    // Remove speaker relations first because the FK
    // uses ON DELETE RESTRICT.
    await client.query(
      `
        DELETE FROM public.sermon_speakers
        WHERE sermon_id = $1
      `,
      [id],
    )

    const deleteResult = await client.query(
      `
        DELETE FROM public.sermons
        WHERE id = $1
        RETURNING *
      `,
      [id],
    )

    const deletedSermon = deleteResult.rows[0]

    await writeActivityLog(client, {
      adminId: req.admin.id,
      action: 'SERMON_DELETED',
      entityId: sermon.id,
      description: `Admin menghapus sermon "${sermon.title}".`,
      metadata: {
        title: sermon.title,
        slug: sermon.slug,
        youtube_video_id: sermon.youtube_video_id,
        preached_at: sermon.preached_at,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    await client.query('COMMIT')

    return deletedSermon
  } catch (error) {
    releaseError = await safeRollback(client)
    throw error
  } finally {
    client.release(releaseError || undefined)
  }
}
