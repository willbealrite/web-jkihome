import pool from '../config/database.js'
import { cloudinary } from '../config/cloudinary.js'

const AUTOMATIC_RETRY_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  15 * 60 * 1000,
]

const BATCH_LIMIT = 10
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000

// -----------------------------------------------------
// 1. Check Media References
// -----------------------------------------------------

async function getMediaReferences(client, mediaId) {
  const constraintsResult = await client.query(
    `
      SELECT
        namespace.nspname AS schema_name,
        relation.relname AS table_name,
        referencing_column.attname AS column_name
      FROM pg_constraint AS constraint_row
      JOIN pg_class AS relation
        ON relation.oid = constraint_row.conrelid
      JOIN pg_namespace AS namespace
        ON namespace.oid = relation.relnamespace
      JOIN pg_attribute AS referencing_column
        ON referencing_column.attrelid = constraint_row.conrelid
        AND referencing_column.attnum = ANY(constraint_row.conkey)
      JOIN pg_attribute AS referenced_column
        ON referenced_column.attrelid = constraint_row.confrelid
        AND referenced_column.attnum = ANY(constraint_row.confkey)
      WHERE constraint_row.contype = 'f'
        AND constraint_row.confrelid = 'public.media'::regclass
        AND referenced_column.attname = 'id'
        AND constraint_row.conrelid <> 'public.media'::regclass
    `,
  )

  const references = []

  for (const constraint of constraintsResult.rows) {
    const schemaName = constraint.schema_name.replace(/"/g, '""')
    const tableName = constraint.table_name.replace(/"/g, '""')
    const columnName = constraint.column_name.replace(/"/g, '""')

    const result = await client.query(
      `
        SELECT EXISTS (
          SELECT 1
          FROM "${schemaName}"."${tableName}"
          WHERE "${columnName}" = $1
        ) AS is_referenced
      `,
      [mediaId],
    )

    if (result.rows[0].is_referenced) {
      references.push({
        table: `${constraint.schema_name}.${constraint.table_name}`,
        column: constraint.column_name,
      })
    }
  }

  return references
}

// -----------------------------------------------------
// 2. Request Media Deletion
// -----------------------------------------------------

export async function requestMediaDeletion({
  mediaId,
  adminId,
  ipAddress = null,
  userAgent = null,
}) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const mediaResult = await client.query(
      `
        SELECT id, file_name, status
        FROM public.media
        WHERE id = $1
        FOR UPDATE
      `,
      [mediaId],
    )

    if (!mediaResult.rowCount) {
      const error = new Error('Media tidak ditemukan.')
      error.statusCode = 404
      throw error
    }

    const media = mediaResult.rows[0]

    if (media.status === 'DELETE_PENDING') {
      const error = new Error(
        'Media sedang dalam proses penghapusan.',
      )
      error.statusCode = 409
      throw error
    }

    const references = await getMediaReferences(client, mediaId)

    if (references.length > 0) {
      const error = new Error(
        'Media masih digunakan oleh modul lain dan tidak dapat dihapus.',
      )
      error.statusCode = 409
      error.references = references
      throw error
    }

    await client.query(
      `
        UPDATE public.media
        SET
          status = 'DELETE_PENDING',
          deletion_requested_at = NOW(),
          deletion_next_retry_at = NOW(),
          delete_attempts = 0,
          last_delete_error = NULL,
          deletion_claimed_at = NULL,
          deletion_claim_token = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [mediaId],
    )

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
          $1,
          'MEDIA_DELETE_REQUESTED',
          'MEDIA',
          'media',
          $2,
          'Admin meminta penghapusan media.',
          $3::jsonb,
          $4,
          $5
        )
      `,
      [
        adminId,
        mediaId,
        JSON.stringify({
          file_name: media.file_name,
        }),
        ipAddress,
        userAgent,
      ],
    )

    await client.query('COMMIT')

    return {
      id: mediaId,
      status: 'DELETE_PENDING',
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// 3. Claim Pending Deletion Jobs
// -----------------------------------------------------

async function claimDeletionJobs() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
      WITH candidates AS (
        SELECT id
        FROM public.media
        WHERE status = 'DELETE_PENDING'
          AND deletion_next_retry_at <= NOW()
          AND (
            deletion_claimed_at IS NULL
            OR deletion_claimed_at < NOW() - ($2 * INTERVAL '1 millisecond')
          )
        ORDER BY deletion_next_retry_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      )
      UPDATE public.media AS media
      SET
        deletion_claimed_at = NOW(),
        deletion_claim_token = gen_random_uuid(),
        updated_at = NOW()
      FROM candidates
      WHERE media.id = candidates.id
      RETURNING media.*;
      `,
      [BATCH_LIMIT, CLAIM_TIMEOUT_MS]
    );

    await client.query('COMMIT');

    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// -----------------------------------------------------
// 4. Record Deletion Failure
// -----------------------------------------------------

async function recordDeletionFailure(media, error) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const attemptNumber = media.delete_attempts + 1
    const retryDelay = AUTOMATIC_RETRY_DELAYS_MS[
      attemptNumber - 1
    ]

    const retryAvailable = retryDelay !== undefined

    const updateResult = await client.query(
      `
        UPDATE public.media
        SET
          delete_attempts = $1,
          last_delete_error = $2,
          deletion_next_retry_at = $3,
          deletion_claimed_at = NULL,
          deletion_claim_token = NULL,
          updated_at = NOW()
        WHERE id = $4
          AND status = 'DELETE_PENDING'
          AND deletion_claim_token = $5
        RETURNING id
      `,
      [
        attemptNumber,
        String(error.message || 'Cloudinary deletion failed')
          .slice(0, 2000),
        retryAvailable
          ? new Date(Date.now() + retryDelay)
          : null,
        media.id,
        media.deletion_claim_token,
      ],
    )

    if (updateResult.rowCount) {
      await client.query(
        `
          INSERT INTO public.admin_activity_logs (
            admin_id,
            action,
            module,
            entity_type,
            entity_id,
            description,
            metadata
          )
          VALUES (
            NULL,
            'MEDIA_DELETE_FAILED',
            'MEDIA',
            'media',
            $1,
            'Penghapusan media gagal.',
            $2::jsonb
          )
        `,
        [
          media.id,
          JSON.stringify({
            attempt: attemptNumber,
            retry_scheduled: retryAvailable,
            error: String(error.message || '').slice(0, 2000),
          }),
        ],
      )
    }

    await client.query('COMMIT')
  } catch (failureError) {
    await client.query('ROLLBACK')
    throw failureError
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// 5. Process and Finalize Media Deletion
// -----------------------------------------------------

async function processDeletion(media) {
  const client = await pool.connect()
  let transactionStarted = false

  try {
    await client.query('BEGIN')
    transactionStarted = true

    // Lock the media row throughout the deletion process.
    const mediaResult = await client.query(
      `
        SELECT id, file_name, public_id, resource_type
        FROM public.media
        WHERE id = $1
          AND status = 'DELETE_PENDING'
          AND deletion_claim_token = $2
        FOR UPDATE
      `,
      [media.id, media.deletion_claim_token],
    )

    if (!mediaResult.rowCount) {
      await client.query('COMMIT')
      transactionStarted = false
      return
    }

    const lockedMedia = mediaResult.rows[0]

    // Check references before deleting the Cloudinary asset.
    const references = await getMediaReferences(
      client,
      lockedMedia.id,
    )

    if (references.length > 0) {
      const error = new Error(
        'Media masih direferensikan oleh modul lain.',
      )

      error.references = references
      throw error
    }

    // Delete the Cloudinary asset while the database row is locked.
    const result = await cloudinary.uploader.destroy(
      lockedMedia.public_id,
      {
        resource_type: lockedMedia.resource_type.toLowerCase(),
        invalidate: true,
      },
    )

    if (
      result.result !== 'ok'
      && result.result !== 'not found'
    ) {
      throw new Error(
        `Cloudinary deletion result: ${result.result}`,
      )
    }

    // Log successful deletion.
    await client.query(
      `
        INSERT INTO public.admin_activity_logs (
          admin_id,
          action,
          module,
          entity_type,
          entity_id,
          description,
          metadata
        )
        VALUES (
          NULL,
          'MEDIA_DELETE_SUCCEEDED',
          'MEDIA',
          'media',
          $1,
          'Media berhasil dihapus dari penyimpanan.',
          $2::jsonb
        )
      `,
      [
        lockedMedia.id,
        JSON.stringify({
          file_name: lockedMedia.file_name,
        }),
      ],
    )

    // Delete the media database record.
    await client.query(
      `
        DELETE FROM public.media
        WHERE id = $1
          AND deletion_claim_token = $2
      `,
      [lockedMedia.id, media.deletion_claim_token],
    )

    await client.query('COMMIT')
    transactionStarted = false
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK')
      transactionStarted = false
    }

    await recordDeletionFailure(media, error)
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// 6. Process Pending Deletion Jobs
// -----------------------------------------------------

export async function processPendingMediaDeletions() {
  const mediaItems = await claimDeletionJobs()

  for (const media of mediaItems) {
    await processDeletion(media)
  }

  return mediaItems.length
}

// -----------------------------------------------------
// 7. Manual Retry
// -----------------------------------------------------

export async function retryMediaDeletion({
  mediaId,
  adminId,
  ipAddress = null,
  userAgent = null,
}) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `
        SELECT
          id,
          file_name,
          status,
          delete_attempts,
          deletion_claimed_at
        FROM public.media
        WHERE id = $1
        FOR UPDATE
      `,
      [mediaId],
    )

    if (!result.rowCount) {
      const error = new Error('Media tidak ditemukan.')
      error.statusCode = 404
      throw error
    }

    const media = result.rows[0]

    if (media.status !== 'DELETE_PENDING') {
      const error = new Error(
        'Media tidak berada dalam status penghapusan.',
      )
      error.statusCode = 409
      throw error
    }

    if (media.delete_attempts < 4) {
      const error = new Error(
        'Automatic retry belum selesai.',
      )
      error.statusCode = 409
      throw error
    }

    if (media.deletion_claimed_at) {
      const error = new Error(
        'Media sedang diproses oleh worker.',
      )
      error.statusCode = 409
      throw error
    }

    await client.query(
      `
        UPDATE public.media
        SET
          delete_attempts = 0,
          last_delete_error = NULL,
          deletion_next_retry_at = NOW(),
          deletion_claimed_at = NULL,
          deletion_claim_token = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [mediaId],
    )

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
          $1,
          'MEDIA_DELETE_MANUAL_RETRY',
          'MEDIA',
          'media',
          $2,
          'Admin melakukan retry penghapusan media.',
          $3::jsonb,
          $4,
          $5
        )
      `,
      [
        adminId,
        mediaId,
        JSON.stringify({
          file_name: media.file_name,
          previous_attempts: media.delete_attempts,
        }),
        ipAddress,
        userAgent,
      ],
    )

    await client.query('COMMIT')

    return {
      id: mediaId,
      status: 'DELETE_PENDING',
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// -----------------------------------------------------
// 8. Get Media Detail
// -----------------------------------------------------

export async function getMediaDetail(mediaId) {
  const result = await pool.query(
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
      WHERE id = $1
    `,
    [mediaId],
  )

  if (!result.rowCount) {
    const error = new Error('Media tidak ditemukan.')
    error.statusCode = 404
    throw error
  }

  return result.rows[0]
}

// -----------------------------------------------------
// 9. Worker Startup
// -----------------------------------------------------

export function startMediaDeletionWorker() {
  let isRunning = false

  async function runWorker() {
    if (isRunning) return

    isRunning = true

    try {
      await processPendingMediaDeletions()
    } catch (error) {
      console.error(
        'Media deletion worker error:',
        error.message,
      )
    } finally {
      isRunning = false
    }
  }

  runWorker()

  const interval = setInterval(
    runWorker,
    60 * 1000,
  )

  return function stopMediaDeletionWorker() {
    clearInterval(interval)
  }
}
