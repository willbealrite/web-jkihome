-- =====================================================
-- Migration: 004_media
-- Project: JKI Home Church
-- Description: Central Media Library
-- Supports: JPEG, PNG, WebP, PDF
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Media Library
-- -----------------------------------------------------

CREATE TABLE public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    file_name VARCHAR(255) NOT NULL,
    public_id VARCHAR(255) NOT NULL UNIQUE,

    -- IMAGE untuk gambar, RAW untuk dokumen PDF
    resource_type VARCHAR(20) NOT NULL,

    mime_type VARCHAR(100) NOT NULL,
    format VARCHAR(20) NOT NULL,

    -- URL penyimpanan internal Cloudinary.
    -- Jangan kirim URL PDF langsung ke pengunjung.
    asset_url TEXT NOT NULL,

    -- Dimensi hanya wajib untuk gambar
    width INTEGER,
    height INTEGER,

    file_size BIGINT NOT NULL,

    alt_text VARCHAR(255),

    uploaded_by UUID,

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    deletion_requested_at TIMESTAMPTZ,
    delete_attempts INTEGER NOT NULL DEFAULT 0,
    last_delete_error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Foreign keys
    -- -------------------------------------------------

    CONSTRAINT media_uploaded_by_fk
        FOREIGN KEY (uploaded_by)
        REFERENCES public.admins(id)
        ON DELETE SET NULL,

    -- -------------------------------------------------
    -- General validation
    -- -------------------------------------------------

    CONSTRAINT media_file_name_not_empty
        CHECK (length(btrim(file_name)) > 0),

    CONSTRAINT media_public_id_not_empty
        CHECK (length(btrim(public_id)) > 0),

    CONSTRAINT media_asset_url_not_empty
        CHECK (length(btrim(asset_url)) > 0),

    CONSTRAINT media_file_size_positive
        CHECK (file_size > 0),

    CONSTRAINT media_delete_attempts_non_negative
        CHECK (delete_attempts >= 0),

    -- -------------------------------------------------
    -- File type validation
    -- -------------------------------------------------

    CONSTRAINT media_file_type_check
        CHECK (
            (
                resource_type = 'IMAGE'
                AND (
                    (
                        mime_type = 'image/jpeg'
                        AND format = 'jpg'
                    )
                    OR (
                        mime_type = 'image/png'
                        AND format = 'png'
                    )
                    OR (
                        mime_type = 'image/webp'
                        AND format = 'webp'
                    )
                )
                AND width IS NOT NULL
                AND height IS NOT NULL
                AND width > 0
                AND height > 0
            )
            OR
            (
                resource_type = 'RAW'
                AND mime_type = 'application/pdf'
                AND format = 'pdf'
                AND width IS NULL
                AND height IS NULL
            )
        ),

    -- -------------------------------------------------
    -- Media status
    -- -------------------------------------------------

    CONSTRAINT media_status_check
        CHECK (
            status IN ('ACTIVE', 'DELETE_PENDING')
        ),

    CONSTRAINT media_deletion_state_check
        CHECK (
            (
                status = 'ACTIVE'
                AND deletion_requested_at IS NULL
            )
            OR
            (
                status = 'DELETE_PENDING'
                AND deletion_requested_at IS NOT NULL
            )
        )
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_media_status_created_at
    ON public.media(status, created_at DESC);

CREATE INDEX idx_media_uploaded_by
    ON public.media(uploaded_by);

-- -----------------------------------------------------
-- 3. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_media_updated_at
BEFORE UPDATE ON public.media
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 4. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('004_media');

COMMIT;
