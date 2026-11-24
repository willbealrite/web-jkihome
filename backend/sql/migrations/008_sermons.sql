-- =====================================================
-- Migration: 008_sermons
-- Project: JKI Home Church
-- Description: Sermons and sermon speakers
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Sermons
-- -----------------------------------------------------

CREATE TABLE public.sermons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(220) NOT NULL UNIQUE,

    description TEXT,

    bible_verse VARCHAR(255),

    youtube_video_id VARCHAR(20) NOT NULL,

    preached_at DATE NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Validation
    -- -------------------------------------------------

    CONSTRAINT sermons_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT sermons_slug_format_check
        CHECK (
            slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        ),

    CONSTRAINT sermons_youtube_video_id_not_empty
        CHECK (
            length(btrim(youtube_video_id)) > 0
            AND youtube_video_id ~ '^[A-Za-z0-9_-]+$'
        ),

    CONSTRAINT sermons_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT sermons_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT sermons_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 2. Sermon Speakers
-- -----------------------------------------------------

CREATE TABLE public.sermon_speakers (
    sermon_id UUID NOT NULL,

    speaker_id UUID NOT NULL,

    speaker_name_snapshot VARCHAR(150) NOT NULL,

    display_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sermon_speakers_pkey
        PRIMARY KEY (sermon_id, speaker_id),

    CONSTRAINT sermon_speakers_sermon_fk
        FOREIGN KEY (sermon_id)
        REFERENCES public.sermons(id)
        ON DELETE RESTRICT,

    CONSTRAINT sermon_speakers_speaker_fk
        FOREIGN KEY (speaker_id)
        REFERENCES public.speakers(id)
        ON DELETE RESTRICT,

    CONSTRAINT sermon_speakers_name_not_empty
        CHECK (
            length(btrim(speaker_name_snapshot)) > 0
        ),

    CONSTRAINT sermon_speakers_order_check
        CHECK (display_order >= 0)
);

-- -----------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_sermons_status_preached_at
    ON public.sermons(status, preached_at DESC);

CREATE INDEX idx_sermons_published_at
    ON public.sermons(published_at DESC)
    WHERE status = 'PUBLISHED';

CREATE INDEX idx_sermons_scheduled_at
    ON public.sermons(scheduled_at)
    WHERE status = 'SCHEDULED';

CREATE INDEX idx_sermon_speakers_speaker
    ON public.sermon_speakers(speaker_id);

CREATE INDEX idx_sermon_speakers_order
    ON public.sermon_speakers(
        sermon_id,
        display_order
    );

-- -----------------------------------------------------
-- 4. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_sermons_updated_at
BEFORE UPDATE ON public.sermons
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 5. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('008_sermons');

COMMIT;
