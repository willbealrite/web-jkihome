import pool from '../config/database.js'

const MODULE = 'SPEAKER_FLYERS'
const ENTITY_TYPE = 'speaker_flyer'

// -----------------------------------------------------
// 1. Error Helper
// -----------------------------------------------------

function createError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// -----------------------------------------------------
// 2. Request Metadata
// -----------------------------------------------------

function getRequestMetadata(req) {
  return {
    adminId: req.admin?.id,
    ipAddress: req.ip || null,
    userAgent: req.get('user-agent') || null,
  }
}

// -----------------------------------------------------
// 3. Activity Log
// -----------------------------------------------------

async function writeActivityLog(client, {
  adminId,
  action,
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
      MODULE,
      ENTITY_TYPE,
      entityId,
      description,
      JSON.stringify(metadata),
      ipAddress,
      userAgent,
    ],
  )
}

// -----------------------------------------------------
// 4. Pagination Validation
// -----------------------------------------------------

function paginationParams(query = {}) {
  const page = query.page === undefined ? 1 : Number(query.page)
  const limit = query.limit === undefined ? 20 : Number(query.limit)

  if (!Number.isInteger(page) || page < 1) {
    throw createError(
      'page harus berupa bilangan bulat positif.',
      400,
    )
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw createError(
      'limit harus antara 1 dan 100.',
      400,
    )
  }

  return { page, limit }
}

// -----------------------------------------------------
// 5. Flyer Listing
// -----------------------------------------------------

async function getFlyerList({ activeOnly, query = {} }) {
  const { page, limit } = paginationParams(query)
  const offset = (page - 1) * limit

  const conditions = [
    "m.resource_type = 'IMAGE'",
    "m.status = 'ACTIVE'",
  ]

  if (activeOnly) {
    conditions.push('sf.is_active = TRUE')
  }

  const condition = `WHERE ${conditions.join(' AND ')}`

  // ---------------------------------------------------
  // 5.1 Count Matching Records
  // ---------------------------------------------------

  const countResult = await pool.query(
    `
      SELECT COUNT(*) AS total_items
      FROM public.speaker_flyers sf
      JOIN public.media m ON m.id = sf.media_id
      ${condition}
    `,
  )

  const totalItems = Number(countResult.rows[0].total_items)

  // ---------------------------------------------------
  // 5.2 Retrieve Records
  // ---------------------------------------------------

  const result = await pool.query(
    `
      SELECT
        sf.id,
        sf.media_id,
        sf.is_active,
        sf.created_at,
        sf.updated_at,
        m.file_name,
        m.asset_url,
        m.alt_text,
        m.width,
        m.height,
        m.format,
        m.created_at AS media_created_at
      FROM public.speaker_flyers sf
      JOIN public.media m ON m.id = sf.media_id
      ${condition}
      ORDER BY sf.created_at DESC, sf.id DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  )

  // ---------------------------------------------------
  // 5.3 Return Listing
  // ---------------------------------------------------

  return {
    items: result.rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  }
}

// -----------------------------------------------------
// 6. Public Listing
// -----------------------------------------------------

export async function getPublicFlyers(query = {}) {
  return getFlyerList({
    activeOnly: true,
    query,
  })
}

// -----------------------------------------------------
// 7. Admin Listing
// -----------------------------------------------------

export async function getAdminFlyers(query = {}) {
  return getFlyerList({
    activeOnly: false,
    query,
  })
}

// -----------------------------------------------------
// 8. Create Speaker Flyer
// -----------------------------------------------------

export async function createSpeakerFlyer(mediaId, req) {
  const {
    adminId,
    ipAddress,
    userAgent,
  } = getRequestMetadata(req)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // -------------------------------------------------
    // 8.1 Verify Media and Lock Row
    // -------------------------------------------------

    const mediaResult = await client.query(
      `
        SELECT
          id,
          file_name,
          asset_url,
          alt_text,
          width,
          height,
          format,
          status,
          resource_type
        FROM public.media
        WHERE id = $1
        FOR UPDATE
      `,
      [mediaId],
    )

    const media = mediaResult.rows[0]

    if (!media) {
      throw createError('Media tidak ditemukan.', 404)
    }

    if (
      media.resource_type !== 'IMAGE' ||
      media.status !== 'ACTIVE'
    ) {
      throw createError(
        'Media harus berupa gambar aktif yang tersedia di Media Library.',
        400,
      )
    }

    // -------------------------------------------------
    // 8.2 Insert Gallery Record
    // -------------------------------------------------

    const flyerResult = await client.query(
      `
        INSERT INTO public.speaker_flyers (
          media_id
        )
        VALUES ($1)
        RETURNING *
      `,
      [mediaId],
    )

    const flyer = flyerResult.rows[0]

    // -------------------------------------------------
    // 8.3 Activity Log
    // -------------------------------------------------

    await writeActivityLog(client, {
      adminId,
      action: 'SPEAKER_FLYER_CREATED',
      entityId: flyer.id,
      description: 'Admin menambahkan flyer ke galeri.',
      metadata: {
        media_id: media.id,
        file_name: media.file_name,
      },
      ipAddress,
      userAgent,
    })

    // -------------------------------------------------
    // 8.4 Commit Transaction
    // -------------------------------------------------

    await client.query('COMMIT')

    return {
      ...flyer,
      media,
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error(
        'Speaker flyer create rollback failed:',
        rollbackError.message,
      )
    }

    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// 9. Update Speaker Flyer
// -----------------------------------------------------

export async function updateSpeakerFlyer(id, data, req) {
  const {
    adminId,
    ipAddress,
    userAgent,
  } = getRequestMetadata(req)

  if (typeof data.is_active !== 'boolean') {
    throw createError(
      'is_active harus berupa boolean.',
      400,
    )
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // -------------------------------------------------
    // 9.1 Retrieve Existing Record and Lock
    // -------------------------------------------------

    const existingResult = await client.query(
      `
        SELECT id, media_id, is_active
        FROM public.speaker_flyers
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    const existing = existingResult.rows[0]

    if (!existing) {
      throw createError('Flyer tidak ditemukan.', 404)
    }

    // -------------------------------------------------
    // 9.2 Update Status
    // -------------------------------------------------

    const updateResult = await client.query(
      `
        UPDATE public.speaker_flyers
        SET is_active = $1
        WHERE id = $2
        RETURNING *
      `,
      [data.is_active, id],
    )

    const flyer = updateResult.rows[0]

    // -------------------------------------------------
    // 9.3 Activity Log
    // -------------------------------------------------

    await writeActivityLog(client, {
      adminId,
      action: 'SPEAKER_FLYER_UPDATED',
      entityId: flyer.id,
      description: 'Admin memperbarui status flyer.',
      metadata: {
        media_id: flyer.media_id,
        previous_is_active: existing.is_active,
        new_is_active: flyer.is_active,
      },
      ipAddress,
      userAgent,
    })

    // -------------------------------------------------
    // 9.4 Commit Transaction
    // -------------------------------------------------

    await client.query('COMMIT')

    return flyer
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error(
        'Speaker flyer update rollback failed:',
        rollbackError.message,
      )
    }

    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// 10. Delete Speaker Flyer
// -----------------------------------------------------

export async function deleteSpeakerFlyer(id, req) {
  const {
    adminId,
    ipAddress,
    userAgent,
  } = getRequestMetadata(req)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // -------------------------------------------------
    // 10.1 Retrieve Existing Record and Lock
    // -------------------------------------------------

    const existingResult = await client.query(
      `
        SELECT
          sf.id,
          sf.media_id,
          sf.is_active,
          m.file_name
        FROM public.speaker_flyers sf
        JOIN public.media m ON m.id = sf.media_id
        WHERE sf.id = $1
        FOR UPDATE OF sf
      `,
      [id],
    )

    const existing = existingResult.rows[0]

    if (!existing) {
      throw createError('Flyer tidak ditemukan.', 404)
    }

    // -------------------------------------------------
    // 10.2 Delete Gallery Record Only
    // -------------------------------------------------

    await client.query(
      `
        DELETE FROM public.speaker_flyers
        WHERE id = $1
      `,
      [id],
    )

    // -------------------------------------------------
    // 10.3 Activity Log
    // -------------------------------------------------

    await writeActivityLog(client, {
      adminId,
      action: 'SPEAKER_FLYER_DELETED',
      entityId: existing.id,
      description: 'Admin menghapus flyer dari galeri.',
      metadata: {
        media_id: existing.media_id,
        file_name: existing.file_name,
        was_active: existing.is_active,
      },
      ipAddress,
      userAgent,
    })

    // -------------------------------------------------
    // 10.4 Commit Transaction
    // -------------------------------------------------

    await client.query('COMMIT')

    return existing
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error(
        'Speaker flyer delete rollback failed:',
        rollbackError.message,
      )
    }

    throw error
  } finally {
    client.release()
  }
}
