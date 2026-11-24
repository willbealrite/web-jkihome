import pool from '../config/database.js'

const PUBLISH_INTERVAL_MS = 60 * 1000
const BATCH_LIMIT = 50

async function publishDueThemes(
  client,
  table,
  entityType,
  requiresPublishedAnnual = false,
) {
  const annualDependencyCondition = requiresPublishedAnnual
    ? `
        AND EXISTS (
          SELECT 1
          FROM public.annual_themes AS annual
          WHERE annual.id = themes.annual_theme_id
            AND annual.status = 'PUBLISHED'
        )
      `
    : ''

  const result = await client.query(
    `
      WITH due_themes AS (
        SELECT themes.id
        FROM public.${table} AS themes
        WHERE themes.status = 'SCHEDULED'
          AND themes.scheduled_at <= NOW()
          ${annualDependencyCondition}
        ORDER BY themes.scheduled_at ASC
        LIMIT $1
        FOR UPDATE OF themes SKIP LOCKED
      )
      UPDATE public.${table} AS themes
      SET
        status = 'PUBLISHED',
        published_at = NOW()
      FROM due_themes
      WHERE themes.id = due_themes.id
      RETURNING
        themes.id,
        themes.title,
        themes.scheduled_at
    `,
    [BATCH_LIMIT],
  )

  for (const theme of result.rows) {
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
          'THEME_AUTO_PUBLISHED',
          'THEMES',
          $1,
          $2,
          'Tema dipublikasikan otomatis oleh scheduler.',
          $3::jsonb
        )
      `,
      [
        entityType,
        theme.id,
        JSON.stringify({
          title: theme.title,
          scheduled_at: theme.scheduled_at,
        }),
      ],
    )
  }

  return result.rowCount
}

export async function publishScheduledThemes() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const annualCount = await publishDueThemes(
      client,
      'annual_themes',
      'annual_theme',
    )

    const monthlyCount = await publishDueThemes(
      client,
      'monthly_themes',
      'monthly_theme',
      true,
    )

    await client.query('COMMIT')

    const total = annualCount + monthlyCount

    if (total > 0) {
      console.log(
        `${total} theme(s) automatically published.`,
      )
    }

    return total
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export function startThemePublisher() {
  let isRunning = false

  async function runPublisher() {
    if (isRunning) return

    isRunning = true

    try {
      await publishScheduledThemes()
    } catch (error) {
      console.error(
        'Theme publisher error:',
        error.message,
      )
    } finally {
      isRunning = false
    }
  }

  runPublisher()

  const interval = setInterval(
    runPublisher,
    PUBLISH_INTERVAL_MS,
  )

  return function stopThemePublisher() {
    clearInterval(interval)
  }
}
