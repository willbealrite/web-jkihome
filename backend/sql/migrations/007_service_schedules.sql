-- =====================================================
-- Migration: 007_service_schedules
-- Project: JKI Home Church
-- Description: Service schedules and speakers
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Service Schedules
-- -----------------------------------------------------

CREATE TABLE public.service_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    category VARCHAR(30) NOT NULL,

    date DATE NOT NULL,

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    location VARCHAR(255) NOT NULL,

    description TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Validation
    -- -------------------------------------------------

    CONSTRAINT service_schedules_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT service_schedules_category_check
        CHECK (
            category IN (
                'WEEKLY_WORSHIP',
                'SPECIAL_SERVICE'
            )
        ),

    CONSTRAINT service_schedules_location_not_empty
        CHECK (length(btrim(location)) > 0),

    CONSTRAINT service_schedules_time_check
        CHECK (end_time > start_time),

    CONSTRAINT service_schedules_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT service_schedules_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT service_schedules_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 2. Service Schedule Speakers
-- -----------------------------------------------------

CREATE TABLE public.service_schedule_speakers (
    service_schedule_id UUID NOT NULL,
    speaker_id UUID NOT NULL,

    speaker_name_snapshot VARCHAR(150) NOT NULL,

    display_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT service_schedule_speakers_pkey
        PRIMARY KEY (service_schedule_id, speaker_id),

    CONSTRAINT service_schedule_speakers_schedule_fk
        FOREIGN KEY (service_schedule_id)
        REFERENCES public.service_schedules(id)
        ON DELETE RESTRICT,

    CONSTRAINT service_schedule_speakers_speaker_fk
        FOREIGN KEY (speaker_id)
        REFERENCES public.speakers(id)
        ON DELETE RESTRICT,

    CONSTRAINT service_schedule_speakers_name_not_empty
        CHECK (length(btrim(speaker_name_snapshot)) > 0),

    CONSTRAINT service_schedule_speakers_order_check
        CHECK (display_order >= 0)
);

-- -----------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_service_schedules_status_date
    ON public.service_schedules(status, date DESC);

CREATE INDEX idx_service_schedules_category_date
    ON public.service_schedules(category, date DESC);

CREATE INDEX idx_service_schedules_scheduled_at
    ON public.service_schedules(scheduled_at)
    WHERE status = 'SCHEDULED';

CREATE INDEX idx_service_schedule_speakers_speaker
    ON public.service_schedule_speakers(speaker_id);

CREATE INDEX idx_service_schedule_speakers_order
    ON public.service_schedule_speakers(
        service_schedule_id,
        display_order
    );

-- -----------------------------------------------------
-- 4. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_service_schedules_updated_at
BEFORE UPDATE ON public.service_schedules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 5. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('007_service_schedules');

COMMIT;
