-- =====================================================
-- Migration: 006_speakers
-- Project: JKI Home Church
-- Description: Speaker management
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Speakers
-- -----------------------------------------------------

CREATE TABLE public.speakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(150) NOT NULL,
    title VARCHAR(100),

    bio TEXT,

    photo_media_id UUID,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Foreign key
    -- -------------------------------------------------

    CONSTRAINT speakers_photo_media_fk
        FOREIGN KEY (photo_media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT,

    -- -------------------------------------------------
    -- Validation
    -- -------------------------------------------------

    CONSTRAINT speakers_name_not_empty
        CHECK (length(btrim(name)) > 0),

    CONSTRAINT speakers_status_check
        CHECK (
            status IN ('ACTIVE', 'ARCHIVED')
        )
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_speakers_status
    ON public.speakers(status);

CREATE INDEX idx_speakers_photo_media
    ON public.speakers(photo_media_id)
    WHERE photo_media_id IS NOT NULL;

-- -----------------------------------------------------
-- 3. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_speakers_updated_at
BEFORE UPDATE ON public.speakers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 4. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('006_speakers');

COMMIT;
