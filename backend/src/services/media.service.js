import pool from '../config/database.js'
import { cloudinary } from '../config/cloudinary.js'
import { uploadImageBuffer } from './cloudinary-upload.service.js'

// -----------------------------------------------------
// 1. File Name Sanitization
// -----------------------------------------------------

function sanitizeFileName(fileName) {
  const normalizedName = String(fileName || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()

  const sanitizedName = normalizedName
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()

  const safeName = sanitizedName || 'untitled-image'

  return Array.from(safeName)
    .slice(0, 255)
    .join('')
}

// -----------------------------------------------------
// 2. Alt Text Sanitization
// -----------------------------------------------------

function sanitizeAltText(altText) {
  if (typeof altText !== 'string') {
    return null
  }

  const sanitizedText = altText.trim()

  if (!sanitizedText) {
    return null
  }

  return Array.from(sanitizedText)
    .slice(0, 255)
    .join('')
}

// -----------------------------------------------------
// 3. Format Normalization
// -----------------------------------------------------

function normalizeImageFormat(format) {
  if (format === 'jpeg') {
    return 'jpg'
  }

  return format
}

// -----------------------------------------------------
// 4. Upload Media to Cloudinary and PostgreSQL
// -----------------------------------------------------

async function uploadMedia({
  file,
  adminId,
  altText = null,
  ipAddress = null,
  userAgent = null,
}) {
  if (!file?.buffer || !adminId) {
    throw new Error('Data upload tidak valid.')
  }

  const client = await pool.connect()

  let cloudinaryResult = null
  let transactionStarted = false
  let commitAttempted = false
  let committed = false

  try {
    // -------------------------------------------------
    // 5. Upload to Cloudinary
    // -------------------------------------------------

    cloudinaryResult = await uploadImageBuffer(file.buffer)

    // -------------------------------------------------
    // 6. Begin Database Transaction
    // -------------------------------------------------

    await client.query('BEGIN')
    transactionStarted = true

    // -------------------------------------------------
    // 7. Insert Media Metadata
    // -------------------------------------------------

    const mediaResult = await client.query(
      `
        INSERT INTO public.media (
          file_name,
          public_id,
          resource_type,
          mime_type,
          format,
          asset_url,
          width,
          height,
          file_size,
          alt_text,
          uploaded_by
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, $11
        )
        RETURNING
          id,
          file_name,
          resource_type,
          mime_type,
          format,
          width,
          height,
          file_size,
          alt_text,
          status,
          created_at
      `,
      [
        sanitizeFileName(file.originalname),
        cloudinaryResult.public_id,
        'IMAGE',
        file.mimetype,
        normalizeImageFormat(cloudinaryResult.format),
        cloudinaryResult.secure_url,
        cloudinaryResult.width,
        cloudinaryResult.height,
        file.buffer.length,
        sanitizeAltText(altText),
        adminId,
      ],
    )

    const media = mediaResult.rows[0]

    // -------------------------------------------------
    // 8. Admin Activity Log
    // -------------------------------------------------

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
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9
        )
      `,
      [
        adminId,
        'MEDIA_UPLOADED',
        'MEDIA',
        'media',
        media.id,
        'Admin mengunggah media baru.',
        JSON.stringify({
          file_name: media.file_name,
          resource_type: media.resource_type,
          format: media.format,
          file_size: media.file_size,
        }),
        ipAddress,
        userAgent,
      ],
    )

    // -------------------------------------------------
    // 9. Commit Transaction
    // -------------------------------------------------

    commitAttempted = true

    await client.query('COMMIT')
    committed = true

    return media
  } catch (error) {
    // -------------------------------------------------
    // 10. Rollback Database Transaction
    // -------------------------------------------------

    if (transactionStarted && !committed) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('[MEDIA DB ROLLBACK ERROR]', {
          message: rollbackError.message,
        })
      }
    }

    // -------------------------------------------------
    // 11. Rollback Cloudinary Asset
    // -------------------------------------------------

    if (cloudinaryResult && !commitAttempted) {
      try {
        const deletionResult = await cloudinary.uploader.destroy(
          cloudinaryResult.public_id,
          {
            resource_type: 'image',
            invalidate: true,
          },
        )

        if (deletionResult.result !== 'ok') {
          console.error('[MEDIA CLOUDINARY CLEANUP ERROR]', {
            public_id: cloudinaryResult.public_id,
            result: deletionResult.result,
          })
        }
      } catch (cloudinaryRollbackError) {
        console.error('[MEDIA CLOUDINARY ROLLBACK ERROR]', {
          public_id: cloudinaryResult.public_id,
          message: cloudinaryRollbackError.message,
        })
      }
    }

    // -------------------------------------------------
    // 12. Commit Outcome Uncertain
    // -------------------------------------------------

    if (cloudinaryResult && commitAttempted && !committed) {
      console.error('[MEDIA COMMIT OUTCOME UNCERTAIN]', {
        public_id: cloudinaryResult.public_id,
        message: error.message,
      })
    }

    throw error
  } finally {
    // -------------------------------------------------
    // 13. Release Database Client
    // -------------------------------------------------

    client.release()
  }
}

// -----------------------------------------------------
// 14. Media Listing
// -----------------------------------------------------

async function getMediaList({
  page,
  limit,
  search,
  status,
  resource_type,
  sort_by,
  order,
}) {
  const conditions = []
  const values = []

  // ---------------------------------------------------
  // 15. Build Filtering Conditions
  // ---------------------------------------------------

  if (search) {
    values.push(`%${search}%`)

    conditions.push(
      `(file_name ILIKE $${values.length}
        OR alt_text ILIKE $${values.length})`,
    )
  }

  if (status) {
    values.push(status)
    conditions.push(`status = $${values.length}`)
  }

  if (resource_type) {
    values.push(resource_type)
    conditions.push(`resource_type = $${values.length}`)
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : ''

  // ---------------------------------------------------
  // 16. Count Total Matching Records
  // ---------------------------------------------------

  const countResult = await pool.query(
    `
      SELECT COUNT(*) AS total_items
      FROM public.media
      ${whereClause}
    `,
    values,
  )

  const totalItems = Number(countResult.rows[0].total_items)

  // ---------------------------------------------------
  // 17. Pagination Calculation
  // ---------------------------------------------------

  const offset = (page - 1) * limit

  // ---------------------------------------------------
  // 18. Whitelisted Sorting
  // ---------------------------------------------------

  const sortColumns = {
    created_at: 'created_at',
    file_name: 'file_name',
    file_size: 'file_size',
  }

  const sortColumn = sortColumns[sort_by]
  const sortOrder = order.toUpperCase()

  // ---------------------------------------------------
  // 19. Retrieve Media Records
  // ---------------------------------------------------

  const listValues = [...values, limit, offset]

  const mediaResult = await pool.query(
    `
      SELECT
        id,
        file_name,
        resource_type,
        mime_type,
        format,
        asset_url,
        width,
        height,
        file_size,
        alt_text,
        status,
        created_at
      FROM public.media
      ${whereClause}
      ORDER BY ${sortColumn} ${sortOrder}, id DESC
      LIMIT $${listValues.length - 1}
      OFFSET $${listValues.length}
    `,
    listValues,
  )

  // ---------------------------------------------------
  // 20. Return Media Listing
  // ---------------------------------------------------

  return {
    items: mediaResult.rows,
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
    },
  }
}

// -----------------------------------------------------
// 21. Export Service
// -----------------------------------------------------

export { uploadMedia, getMediaList }
