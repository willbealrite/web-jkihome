-- =====================================================
-- Migration: 011_homepage_settings
-- Project: JKI Home Church
-- Description: Homepage configuration and visibility
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Homepage Settings
-- -----------------------------------------------------

CREATE TABLE public.homepage_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    singleton_key SMALLINT NOT NULL DEFAULT 1,

    section_visibility JSONB NOT NULL DEFAULT '{
        "hero": true,
        "annualTheme": true,
        "serviceSchedule": true,
        "dailyDevotional": true,
        "featuredSermon": true,
        "gallery": true,
        "announcements": true,
        "aboutChurch": true,
        "contactLocation": true
    }'::JSONB,

    hero_title VARCHAR(200),

    hero_description TEXT,

    hero_background_media_id UUID,

    hero_cta_text VARCHAR(100),

    hero_cta_url VARCHAR(2048),

    featured_announcement_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Singleton Validation
    -- -------------------------------------------------

    CONSTRAINT homepage_settings_singleton_key_unique
        UNIQUE (singleton_key),

    CONSTRAINT homepage_settings_singleton_key_check
        CHECK (singleton_key = 1),

    -- -------------------------------------------------
    -- JSON Validation
    -- -------------------------------------------------

    CONSTRAINT homepage_settings_visibility_object_check
        CHECK (
            jsonb_typeof(section_visibility) = 'object'
        ),

    -- -------------------------------------------------
    -- Foreign Keys
    -- -------------------------------------------------

    CONSTRAINT homepage_settings_hero_media_fk
        FOREIGN KEY (hero_background_media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT,

    CONSTRAINT homepage_settings_featured_announcement_fk
        FOREIGN KEY (featured_announcement_id)
        REFERENCES public.announcements(id)
        ON DELETE RESTRICT,

    -- -------------------------------------------------
    -- Field Validation
    -- -------------------------------------------------

    CONSTRAINT homepage_settings_hero_title_not_empty
        CHECK (
            hero_title IS NULL
            OR length(btrim(hero_title)) > 0
        ),

    CONSTRAINT homepage_settings_hero_cta_text_not_empty
        CHECK (
            hero_cta_text IS NULL
            OR length(btrim(hero_cta_text)) > 0
        ),

    CONSTRAINT homepage_settings_hero_cta_url_not_empty
        CHECK (
            hero_cta_url IS NULL
            OR length(btrim(hero_cta_url)) > 0
        )
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_homepage_settings_hero_media
    ON public.homepage_settings(hero_background_media_id)
    WHERE hero_background_media_id IS NOT NULL;

CREATE INDEX idx_homepage_settings_featured_announcement
    ON public.homepage_settings(featured_announcement_id)
    WHERE featured_announcement_id IS NOT NULL;

-- -----------------------------------------------------
-- 3. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_homepage_settings_updated_at
BEFORE UPDATE ON public.homepage_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 4. Initial Homepage Configuration
-- -----------------------------------------------------

INSERT INTO public.homepage_settings (singleton_key)
VALUES (1);

-- -----------------------------------------------------
-- 5. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('011_homepage_settings');

COMMIT;
