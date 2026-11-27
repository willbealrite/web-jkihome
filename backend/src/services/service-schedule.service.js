import pool from '../config/database.js'

// Advisory lock shared by operations that allocate or rearrange display order.
const SERVICE_SCHEDULE_LOCK_KEY = 731902

async function getPublicServiceSchedules() {
  const result = await pool.query(`
    SELECT id, title, schedule_info, display_order
    FROM public.service_schedule_items
    WHERE is_active = TRUE
    ORDER BY display_order ASC, id ASC
  `)

  return result.rows
}

async function getAdminServiceSchedules() {
  const result = await pool.query(`
    SELECT id, title, schedule_info, display_order, is_active
    FROM public.service_schedule_items
    ORDER BY display_order ASC, id ASC
  `)

  return result.rows
}

// -----------------------------------------------------
// CREATE
// -----------------------------------------------------

async function createServiceSchedule(data, req) {
  const client = await pool.connect()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    // Serialize order allocation with reorder operations.
    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [SERVICE_SCHEDULE_LOCK_KEY],
    )

    const orderResult = await client.query(`
      SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order
      FROM public.service_schedule_items
    `)

    const displayOrder = orderResult.rows[0].next_order

    const result = await client.query(
      `
        INSERT INTO public.service_schedule_items (
          title,
          schedule_info,
          display_order
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [data.title.trim(), data.schedule_info.trim(), displayOrder],
    )

    const item = result.rows[0]

    await writeAuditLog(client, {
      adminId: req.admin.id,
      action: 'SERVICE_SCHEDULE_CREATED',
      entityId: item.id,
      description: 'Admin membuat jadwal ibadah.',
      metadata: item,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    await client.query('COMMIT')
    transactionStarted = false

    return item
  } catch (error) {
    if (transactionStarted) {
      await rollbackSafely(client)
      transactionStarted = false
    }

    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// UPDATE
// -----------------------------------------------------

async function updateServiceSchedule(id, data, req) {
  const client = await pool.connect()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    const existingResult = await client.query(
      `
        SELECT *
        FROM public.service_schedule_items
        WHERE id = $1
        FOR UPDATE
      `,
      [id],
    )

    if (!existingResult.rowCount) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return null
    }

    const existing = existingResult.rows[0]

    const title =
      data.title !== undefined
        ? data.title.trim()
        : existing.title

    const scheduleInfo =
      data.schedule_info !== undefined
        ? data.schedule_info.trim()
        : existing.schedule_info

    const isActive =
      data.is_active !== undefined
        ? data.is_active
        : existing.is_active

    const result = await client.query(
      `
        UPDATE public.service_schedule_items
        SET title = $1,
            schedule_info = $2,
            is_active = $3
        WHERE id = $4
        RETURNING *
      `,
      [title, scheduleInfo, isActive, id],
    )

    const item = result.rows[0]

    await writeAuditLog(client, {
      adminId: req.admin.id,
      action: 'SERVICE_SCHEDULE_UPDATED',
      entityId: item.id,
      description: 'Admin memperbarui jadwal ibadah.',
      metadata: { before: existing, after: item },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    await client.query('COMMIT')
    transactionStarted = false

    return item
  } catch (error) {
    if (transactionStarted) {
      await rollbackSafely(client)
      transactionStarted = false
    }

    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// DELETE
// -----------------------------------------------------

async function deleteServiceSchedule(id, req) {
  const client = await pool.connect()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    const result = await client.query(
      `
        DELETE FROM public.service_schedule_items
        WHERE id = $1
        RETURNING *
      `,
      [id],
    )

    if (!result.rowCount) {
      await client.query('ROLLBACK')
      transactionStarted = false
      return null
    }

    const item = result.rows[0]

    await writeAuditLog(client, {
      adminId: req.admin.id,
      action: 'SERVICE_SCHEDULE_DELETED',
      entityId: item.id,
      description: 'Admin menghapus jadwal ibadah.',
      metadata: item,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    await client.query('COMMIT')
    transactionStarted = false

    return item
  } catch (error) {
    if (transactionStarted) {
      await rollbackSafely(client)
      transactionStarted = false
    }

    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// REORDER
// -----------------------------------------------------

async function reorderServiceSchedules(items, req) {
  const client = await pool.connect()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    // Serialize reorder operations and order allocation.
    await client.query(
      'SELECT pg_advisory_xact_lock($1)',
      [SERVICE_SCHEDULE_LOCK_KEY],
    )

    const currentResult = await client.query(`
      SELECT id, display_order
      FROM public.service_schedule_items
      ORDER BY display_order, id
      FOR UPDATE
    `)

    const existingIds = new Set(
      currentResult.rows.map((item) => item.id),
    )

    for (const item of items) {
      if (!existingIds.has(item.id)) {
        const error = new Error(
          'Jadwal yang diberikan tidak ditemukan.',
        )
        error.statusCode = 404
        throw error
      }
    }

    for (const item of items) {
      await client.query(
        `
          UPDATE public.service_schedule_items
          SET display_order = $1
          WHERE id = $2
        `,
        [item.display_order, item.id],
      )
    }

    await writeAuditLog(client, {
      adminId: req.admin.id,
      action: 'SERVICE_SCHEDULE_REORDERED',
      entityId: null,
      description: 'Admin mengubah urutan jadwal ibadah.',
      metadata: { items },
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    })

    await client.query('COMMIT')
    transactionStarted = false

    return await getAdminServiceSchedules()
  } catch (error) {
    if (transactionStarted) {
      await rollbackSafely(client)
      transactionStarted = false
    }

    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// AUDIT LOG
// -----------------------------------------------------

async function writeAuditLog(client, data) {
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      data.adminId,
      data.action,
      'SERVICE_SCHEDULE',
      'service_schedule_item',
      data.entityId,
      data.description,
      JSON.stringify(data.metadata),
      data.ipAddress,
      data.userAgent,
    ],
  )
}

// -----------------------------------------------------
// TRANSACTION HELPER
// -----------------------------------------------------

async function rollbackSafely(client) {
  try {
    await client.query('ROLLBACK')
  } catch {
    // Preserve the original error if rollback itself fails.
  }
}

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------

export {
  getPublicServiceSchedules,
  getAdminServiceSchedules,
  createServiceSchedule,
  updateServiceSchedule,
  deleteServiceSchedule,
  reorderServiceSchedules,
}
