-- =====================================================
-- Migration: 015_scheduler_and_gallery_indexes
-- Project: JKI Home Church
-- Description: Supporting indexes for scheduled content
--              and gallery cover photo relationships
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Annual Themes Scheduler Index
-- -----------------------------------------------------

CREATE INDEX idx_annual_themes_scheduled_at
    ON public.annual_themes(scheduled_at)
    WHERE status = 'SCHEDULED';

-- -----------------------------------------------------
-- 2. Monthly Themes Scheduler Index
-- -----------------------------------------------------

CREATE INDEX idx_monthly_themes_scheduled_at
    ON public.monthly_themes(scheduled_at)
    WHERE status = 'SCHEDULED';

-- -----------------------------------------------------
-- 3. Gallery Album Cover Photo Relationship Index
-- -----------------------------------------------------

CREATE INDEX idx_gallery_albums_cover_photo
    ON public.gallery_albums(cover_photo_id, id)
    WHERE cover_photo_id IS NOT NULL;

-- -----------------------------------------------------
-- 4. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('015_scheduler_and_gallery_indexes');

COMMIT;
