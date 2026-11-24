-- =====================================================
-- Migration: 009_gallery
-- Project: JKI Home Church
-- Description: Gallery categories, albums, and photos
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Gallery Categories
-- -----------------------------------------------------

CREATE TABLE public.gallery_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    slug VARCHAR(120) NOT NULL UNIQUE,

    is_system BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT gallery_categories_name_not_empty
        CHECK (length(btrim(name)) > 0),

    CONSTRAINT gallery_categories_slug_format_check
        CHECK (
            slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        )
);

-- -----------------------------------------------------
-- 2. Gallery Albums
-- -----------------------------------------------------

CREATE TABLE public.gallery_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    category_id UUID NOT NULL,

    title VARCHAR(200) NOT NULL,

    slug VARCHAR(220) NOT NULL UNIQUE,

    description TEXT,

    event_date DATE,

    cover_photo_id UUID,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT gallery_albums_category_fk
        FOREIGN KEY (category_id)
        REFERENCES public.gallery_categories(id)
        ON DELETE RESTRICT,

    CONSTRAINT gallery_albums_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT gallery_albums_slug_format_check
        CHECK (
            slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        ),

    CONSTRAINT gallery_albums_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT gallery_albums_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT gallery_albums_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        ),

    -- Composite key target for same-album cover validation.
    CONSTRAINT gallery_albums_id_unique
        UNIQUE (id)
);

-- -----------------------------------------------------
-- 3. Gallery Photos
-- -----------------------------------------------------

CREATE TABLE public.gallery_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    album_id UUID NOT NULL,

    media_id UUID NOT NULL,

    caption VARCHAR(255),

    alt_text VARCHAR(255),

    sort_order SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique pair allows album cover to reference
    -- a photo belonging to the same album.
    CONSTRAINT gallery_photos_id_album_unique
        UNIQUE (id, album_id),

    CONSTRAINT gallery_photos_album_fk
        FOREIGN KEY (album_id)
        REFERENCES public.gallery_albums(id)
        ON DELETE RESTRICT,

    CONSTRAINT gallery_photos_media_fk
        FOREIGN KEY (media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT,

    CONSTRAINT gallery_photos_order_check
        CHECK (sort_order >= 0)
);

-- -----------------------------------------------------
-- 4. Album Cover Foreign Key
-- -----------------------------------------------------

ALTER TABLE public.gallery_albums
ADD CONSTRAINT gallery_albums_cover_photo_fk
    FOREIGN KEY (cover_photo_id, id)
    REFERENCES public.gallery_photos(id, album_id)
    ON DELETE RESTRICT;

-- -----------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_gallery_albums_category
    ON public.gallery_albums(category_id);

CREATE INDEX idx_gallery_albums_status_published
    ON public.gallery_albums(status, published_at DESC);

CREATE INDEX idx_gallery_albums_scheduled_at
    ON public.gallery_albums(scheduled_at)
    WHERE status = 'SCHEDULED';

CREATE INDEX idx_gallery_photos_album_order
    ON public.gallery_photos(album_id, sort_order);

CREATE INDEX idx_gallery_photos_media
    ON public.gallery_photos(media_id);

-- -----------------------------------------------------
-- 6. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_gallery_categories_updated_at
BEFORE UPDATE ON public.gallery_categories
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_gallery_albums_updated_at
BEFORE UPDATE ON public.gallery_albums
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 7. Seed System Categories
-- -----------------------------------------------------

INSERT INTO public.gallery_categories (name, slug, is_system)
VALUES
    ('Worship', 'worship', TRUE),
    ('Church Event', 'church-event', TRUE),
    ('Community', 'community', TRUE),
    ('Special Event', 'special-event', TRUE);

-- -----------------------------------------------------
-- 8. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('009_gallery');

COMMIT;
