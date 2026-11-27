-- =====================================================
-- Migration: 017_speaker_flyers
-- Project: JKI Home Church
-- Description: Speaker Flyer Gallery
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Speaker Flyer Gallery
-- -----------------------------------------------------

CREATE TABLE public.speaker_flyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    media_id UUID NOT NULL UNIQUE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Foreign Key
    -- -------------------------------------------------

    CONSTRAINT speaker_flyers_media_fk
        FOREIGN KEY (media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_speaker_flyers_active_created
    ON public.speaker_flyers(is_active, created_at DESC);

-- -----------------------------------------------------
-- 3. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_speaker_flyers_updated_at
BEFORE UPDATE ON public.speaker_flyers
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 4. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('017_speaker_flyers');

COMMIT;
