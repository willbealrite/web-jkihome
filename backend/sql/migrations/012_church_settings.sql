-- =====================================================
-- Migration: 012_church_settings
-- Project: JKI Home Church
-- Description: Official church information and affiliation
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Church Settings
-- -----------------------------------------------------

CREATE TABLE public.church_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    singleton_key SMALLINT NOT NULL DEFAULT 1,

    -- Church Identity
    church_name VARCHAR(200) NOT NULL,

    short_description TEXT,

    founding_year SMALLINT,

    -- Church Profile
    history TEXT,

    vision TEXT,

    mission TEXT,

    core_values JSONB,

    ministries JSONB,

    -- Contact Information
    address TEXT,

    phone VARCHAR(30),

    whatsapp VARCHAR(30),

    email VARCHAR(255),

    google_maps_url VARCHAR(2048),

    -- Social Media
    social_media JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Church Affiliation
    affiliation_name VARCHAR(200),

    affiliation_logo_media_id UUID,

    affiliation_description TEXT,

    affiliation_website VARCHAR(2048),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Singleton Validation
    -- -------------------------------------------------

    CONSTRAINT church_settings_singleton_key_unique
        UNIQUE (singleton_key),

    CONSTRAINT church_settings_singleton_key_check
        CHECK (singleton_key = 1),

    -- -------------------------------------------------
    -- Church Name Validation
    -- -------------------------------------------------

    CONSTRAINT church_settings_name_not_empty
        CHECK (length(btrim(church_name)) > 0),

    -- -------------------------------------------------
    -- Founding Year Validation
    -- -------------------------------------------------

    CONSTRAINT church_settings_founding_year_check
        CHECK (
            founding_year IS NULL
            OR founding_year BETWEEN 1 AND 9999
        ),

    -- -------------------------------------------------
    -- JSON Validation
    -- -------------------------------------------------

    CONSTRAINT church_settings_core_values_array_check
        CHECK (
            core_values IS NULL
            OR jsonb_typeof(core_values) = 'array'
        ),

    CONSTRAINT church_settings_ministries_array_check
        CHECK (
            ministries IS NULL
            OR jsonb_typeof(ministries) = 'array'
        ),

    CONSTRAINT church_settings_social_media_object_check
        CHECK (
            jsonb_typeof(social_media) = 'object'
        ),

    -- -------------------------------------------------
    -- Foreign Keys
    -- -------------------------------------------------

    CONSTRAINT church_settings_affiliation_logo_fk
        FOREIGN KEY (affiliation_logo_media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_church_settings_affiliation_logo
    ON public.church_settings(affiliation_logo_media_id)
    WHERE affiliation_logo_media_id IS NOT NULL;

-- -----------------------------------------------------
-- 3. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_church_settings_updated_at
BEFORE UPDATE ON public.church_settings
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 4. Initial Church Settings
-- -----------------------------------------------------

INSERT INTO public.church_settings (
    singleton_key,
    church_name
)
VALUES (
    1,
    'JKI Home Church'
);

-- -----------------------------------------------------
-- 5. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('012_church_settings');

COMMIT;
