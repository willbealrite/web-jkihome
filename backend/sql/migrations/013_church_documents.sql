-- =====================================================
-- Migration: 013_church_documents
-- Project: JKI Home Church
-- Description: Church documents and PDF management
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Church Documents
-- -----------------------------------------------------

CREATE TABLE public.church_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(200) NOT NULL,

    document_type VARCHAR(50) NOT NULL,

    description TEXT,

    media_id UUID NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Foreign Keys
    -- -------------------------------------------------

    CONSTRAINT church_documents_media_fk
        FOREIGN KEY (media_id)
        REFERENCES public.media(id)
        ON DELETE RESTRICT,

    -- -------------------------------------------------
    -- Validation
    -- -------------------------------------------------

    CONSTRAINT church_documents_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT church_documents_type_not_empty
        CHECK (length(btrim(document_type)) > 0),

    CONSTRAINT church_documents_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT church_documents_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT church_documents_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_church_documents_status_published
    ON public.church_documents(status, published_at DESC);

CREATE INDEX idx_church_documents_type_status
    ON public.church_documents(document_type, status);

CREATE INDEX idx_church_documents_scheduled_at
    ON public.church_documents(scheduled_at)
    WHERE status = 'SCHEDULED';

CREATE INDEX idx_church_documents_media
    ON public.church_documents(media_id);

-- -----------------------------------------------------
-- 3. One Published Organizational Structure
-- -----------------------------------------------------

CREATE UNIQUE INDEX uq_church_documents_published_organizational_structure
    ON public.church_documents(document_type)
    WHERE document_type = 'ORGANIZATIONAL_STRUCTURE'
      AND status = 'PUBLISHED';

-- -----------------------------------------------------
-- 4. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_church_documents_updated_at
BEFORE UPDATE ON public.church_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 5. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('013_church_documents');

COMMIT;
