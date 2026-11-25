import pool from '../config/database.js'

const PUBLISH_INTERVAL_MS = 60 * 1000
const BATCH_LIMIT = 50


// -----------------------------------------------------
// 1. Publish Scheduled Themes
// Annual Theme & Monthly Theme
// -----------------------------------------------------

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


// -----------------------------------------------------
// 2. Publish Scheduled Devotionals
// Daily Devotional
// -----------------------------------------------------

async function publishDueDevotionals(client) {
  const result = await client.query(
    `
      WITH due_devotionals AS (
        SELECT
          devotionals.id,
          devotionals.scheduled_at
        FROM public.devotionals AS devotionals
        WHERE devotionals.status = 'SCHEDULED'
          AND devotionals.scheduled_at <= NOW()
        ORDER BY devotionals.scheduled_at ASC
        LIMIT $1
        FOR UPDATE OF devotionals SKIP LOCKED
      ),
      published_devotionals AS (
        UPDATE public.devotionals AS devotionals
        SET
          status = 'PUBLISHED',
          published_at = NOW(),
          scheduled_at = NULL
        FROM due_devotionals
        WHERE devotionals.id = due_devotionals.id
        RETURNING
          devotionals.id,
          devotionals.title,
          devotionals.date
      )
      SELECT
        published_devotionals.id,
        published_devotionals.title,
        published_devotionals.date,
        due_devotionals.scheduled_at
      FROM published_devotionals
      INNER JOIN due_devotionals
        ON due_devotionals.id = published_devotionals.id
    `,
    [BATCH_LIMIT],
  )

  for (const devotional of result.rows) {
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
          'DEVOTIONAL_AUTO_PUBLISHED',
          'DEVOTIONALS',
          'devotional',
          $1,
          'Renungan harian dipublikasikan otomatis oleh scheduler.',
          $2::jsonb
        )
      `,
      [
        devotional.id,
        JSON.stringify({
          title: devotional.title,
          date: devotional.date,
          scheduled_at: devotional.scheduled_at,
        }),
      ],
    )
  }

  return result.rowCount
}


// -----------------------------------------------------
// 3. Publish All Scheduled Content
// Annual Themes, Monthly Themes & Devotionals
// -----------------------------------------------------

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

    const devotionalCount = await publishDueDevotionals(client)

    await client.query('COMMIT')

    const total =
      annualCount +
      monthlyCount +
      devotionalCount

    if (total > 0) {
      console.log(
        `${total} scheduled content item(s) automatically published.`,
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


// -----------------------------------------------------
// 4. Start Theme & Devotional Publisher
// Runs immediately and every 60 seconds
// -----------------------------------------------------

export function startThemePublisher() {
  let isRunning = false

  async function runPublisher() {
    if (isRunning) return

    isRunning = true

    try {
      await publishScheduledThemes()
    } catch (error) {
      console.error(
        'Content publisher error:',
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
