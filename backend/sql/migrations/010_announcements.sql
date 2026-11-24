-- =====================================================
-- Migration: 010_announcements
-- Project: JKI Home Church
-- Description: Announcement categories and announcements
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Announcement Categories
-- -----------------------------------------------------

CREATE TABLE public.announcement_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    slug VARCHAR(120) NOT NULL UNIQUE,

    is_system BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT announcement_categories_name_not_empty
        CHECK (length(btrim(name)) > 0),

    CONSTRAINT announcement_categories_slug_format_check
        CHECK (
            slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        )
);

-- -----------------------------------------------------
-- 2. Announcements
-- -----------------------------------------------------

CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(220) NOT NULL UNIQUE,

    content TEXT NOT NULL,

    image_media_id UUID,

    event_date DATE,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Foreign Keys
    -- -------------------------------------------------

    CONSTRAINT announcements_category_fk
        FOREIGN KEY (category_id)
        REFERENCES public.announcement_categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT announcements_image_media_fk
        FOREIGN KEY (image_media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT,

    -- -------------------------------------------------
    -- Validation
    -- -------------------------------------------------

    CONSTRAINT announcements_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT announcements_slug_format_check
        CHECK (
            slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        ),

    CONSTRAINT announcements_content_not_empty
        CHECK (length(btrim(content)) > 0),

    CONSTRAINT announcements_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT announcements_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT announcements_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_announcements_category
    ON public.announcements(category_id);

CREATE INDEX idx_announcements_status_published
    ON public.announcements(status, published_at DESC);

CREATE INDEX idx_announcements_scheduled_at
    ON public.announcements(scheduled_at)
    WHERE status = 'SCHEDULED';

CREATE INDEX idx_announcements_image_media
    ON public.announcements(image_media_id)
    WHERE image_media_id IS NOT NULL;

-- -----------------------------------------------------
-- 4. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_announcement_categories_updated_at
BEFORE UPDATE ON public.announcement_categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 5. Seed System Categories
-- -----------------------------------------------------

INSERT INTO public.announcement_categories (
    name,
    slug,
    is_system
)
VALUES
    ('Church News', 'church-news', TRUE),
    ('Worship Info', 'worship-info', TRUE),
    ('Event', 'event', TRUE),
    ('Community', 'community', TRUE),
    ('General', 'general', TRUE);

-- -----------------------------------------------------
-- 6. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('010_announcements');

COMMIT;
