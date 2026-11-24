import pool from '../config/database.js'

export async function getDashboardData() {
  const [overviewResult, upcomingResult, activityResult] =
    await Promise.all([
      pool.query(`
        SELECT
          (
            SELECT COUNT(*) FROM public.annual_themes
          ) AS annual_themes_total,
          (
            SELECT COUNT(*) FROM public.monthly_themes
          ) AS monthly_themes_total,

          (
            SELECT COUNT(*) FROM public.devotionals
          ) AS devotionals_total,
          (
            SELECT COUNT(*) FROM public.devotionals
            WHERE status = 'DRAFT'
          ) AS devotionals_draft,
          (
            SELECT COUNT(*) FROM public.devotionals
            WHERE status = 'SCHEDULED'
          ) AS devotionals_scheduled,
          (
            SELECT COUNT(*) FROM public.devotionals
            WHERE status = 'PUBLISHED'
          ) AS devotionals_published,
          (
            SELECT COUNT(*) FROM public.devotionals
            WHERE status = 'ARCHIVED'
          ) AS devotionals_archived,

          (
            SELECT COUNT(*) FROM public.speakers
          ) AS speakers_total,
          (
            SELECT COUNT(*) FROM public.speakers
            WHERE status = 'ACTIVE'
          ) AS speakers_active,
          (
            SELECT COUNT(*) FROM public.speakers
            WHERE status = 'ARCHIVED'
          ) AS speakers_archived,

          (
            SELECT COUNT(*) FROM public.service_schedules
          ) AS service_schedules_total,
          (
            SELECT COUNT(*) FROM public.service_schedules
            WHERE status = 'DRAFT'
          ) AS service_schedules_draft,
          (
            SELECT COUNT(*) FROM public.service_schedules
            WHERE status = 'SCHEDULED'
          ) AS service_schedules_scheduled,
          (
            SELECT COUNT(*) FROM public.service_schedules
            WHERE status = 'PUBLISHED'
          ) AS service_schedules_published,
          (
            SELECT COUNT(*) FROM public.service_schedules
            WHERE status = 'ARCHIVED'
          ) AS service_schedules_archived,

          (
            SELECT COUNT(*) FROM public.sermons
          ) AS sermons_total,
          (
            SELECT COUNT(*) FROM public.sermons
            WHERE status = 'DRAFT'
          ) AS sermons_draft,
          (
            SELECT COUNT(*) FROM public.sermons
            WHERE status = 'SCHEDULED'
          ) AS sermons_scheduled,
          (
            SELECT COUNT(*) FROM public.sermons
            WHERE status = 'PUBLISHED'
          ) AS sermons_published,
          (
            SELECT COUNT(*) FROM public.sermons
            WHERE status = 'ARCHIVED'
          ) AS sermons_archived,

          (
            SELECT COUNT(*) FROM public.gallery_albums
          ) AS gallery_albums_total,
          (
            SELECT COUNT(*) FROM public.gallery_albums
            WHERE status = 'DRAFT'
          ) AS gallery_albums_draft,
          (
            SELECT COUNT(*) FROM public.gallery_albums
            WHERE status = 'SCHEDULED'
          ) AS gallery_albums_scheduled,
          (
            SELECT COUNT(*) FROM public.gallery_albums
            WHERE status = 'PUBLISHED'
          ) AS gallery_albums_published,
          (
            SELECT COUNT(*) FROM public.gallery_albums
            WHERE status = 'ARCHIVED'
          ) AS gallery_albums_archived,

          (
            SELECT COUNT(*) FROM public.announcements
          ) AS announcements_total,
          (
            SELECT COUNT(*) FROM public.announcements
            WHERE status = 'DRAFT'
          ) AS announcements_draft,
          (
            SELECT COUNT(*) FROM public.announcements
            WHERE status = 'SCHEDULED'
          ) AS announcements_scheduled,
          (
            SELECT COUNT(*) FROM public.announcements
            WHERE status = 'PUBLISHED'
          ) AS announcements_published,
          (
            SELECT COUNT(*) FROM public.announcements
            WHERE status = 'ARCHIVED'
          ) AS announcements_archived
      `),

      pool.query(`
        SELECT *
        FROM (
          SELECT
            'DEVOTIONAL' AS content_type,
            id,
            title,
            scheduled_at
          FROM public.devotionals
          WHERE status = 'SCHEDULED'
            AND scheduled_at >= NOW()

          UNION ALL

          SELECT
            'SERVICE_SCHEDULE',
            id,
            title,
            scheduled_at
          FROM public.service_schedules
          WHERE status = 'SCHEDULED'
            AND scheduled_at >= NOW()

          UNION ALL

          SELECT
            'SERMON',
            id,
            title,
            scheduled_at
          FROM public.sermons
          WHERE status = 'SCHEDULED'
            AND scheduled_at >= NOW()

          UNION ALL

          SELECT
            'GALLERY_ALBUM',
            id,
            title,
            scheduled_at
          FROM public.gallery_albums
          WHERE status = 'SCHEDULED'
            AND scheduled_at >= NOW()

          UNION ALL

          SELECT
            'ANNOUNCEMENT',
            id,
            title,
            scheduled_at
          FROM public.announcements
          WHERE status = 'SCHEDULED'
            AND scheduled_at >= NOW()
        ) AS upcoming
        ORDER BY scheduled_at ASC
        LIMIT 10
      `),

      pool.query(`
        SELECT
          logs.id,
          logs.action,
          logs.module,
          logs.entity_type,
          logs.entity_id,
          logs.description,
          logs.created_at,
          admins.name AS admin_name
        FROM public.admin_activity_logs AS logs
        LEFT JOIN public.admins
          ON admins.id = logs.admin_id
        ORDER BY logs.created_at DESC
        LIMIT 10
      `),
    ])

  const row = overviewResult.rows[0]

  const count = (value) => Number(value)

  const overview = {
    annualThemes: {
      total: count(row.annual_themes_total),
    },
    monthlyThemes: {
      total: count(row.monthly_themes_total),
    },
    devotionals: {
      total: count(row.devotionals_total),
      draft: count(row.devotionals_draft),
      scheduled: count(row.devotionals_scheduled),
      published: count(row.devotionals_published),
      archived: count(row.devotionals_archived),
    },
    speakers: {
      total: count(row.speakers_total),
      active: count(row.speakers_active),
      archived: count(row.speakers_archived),
    },
    serviceSchedules: {
      total: count(row.service_schedules_total),
      draft: count(row.service_schedules_draft),
      scheduled: count(row.service_schedules_scheduled),
      published: count(row.service_schedules_published),
      archived: count(row.service_schedules_archived),
    },
    sermons: {
      total: count(row.sermons_total),
      draft: count(row.sermons_draft),
      scheduled: count(row.sermons_scheduled),
      published: count(row.sermons_published),
      archived: count(row.sermons_archived),
    },
    galleryAlbums: {
      total: count(row.gallery_albums_total),
      draft: count(row.gallery_albums_draft),
      scheduled: count(row.gallery_albums_scheduled),
      published: count(row.gallery_albums_published),
      archived: count(row.gallery_albums_archived),
    },
    announcements: {
      total: count(row.announcements_total),
      draft: count(row.announcements_draft),
      scheduled: count(row.announcements_scheduled),
      published: count(row.announcements_published),
      archived: count(row.announcements_archived),
    },
  }

  return {
    overview,
    upcomingContent: upcomingResult.rows,
    recentActivities: activityResult.rows,
  }
}
