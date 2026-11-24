-- =====================================================
-- Migration: 005_themes_and_devotionals
-- Project: JKI Home Church
-- Description: Annual Themes, Monthly Themes,
--              and Daily Devotionals
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Annual Themes
-- -----------------------------------------------------

CREATE TABLE public.annual_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    year SMALLINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    bible_verse VARCHAR(255),

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT annual_themes_year_unique
        UNIQUE (year),

    CONSTRAINT annual_themes_year_check
        CHECK (year BETWEEN 2000 AND 9999),

    CONSTRAINT annual_themes_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT annual_themes_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT annual_themes_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT annual_themes_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 2. Monthly Themes
-- -----------------------------------------------------

CREATE TABLE public.monthly_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    annual_theme_id UUID NOT NULL,

    month SMALLINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    bible_verse VARCHAR(255),

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT monthly_themes_annual_theme_fk
        FOREIGN KEY (annual_theme_id)
        REFERENCES public.annual_themes(id)
        ON DELETE RESTRICT,

    CONSTRAINT monthly_themes_annual_month_unique
        UNIQUE (annual_theme_id, month),

    CONSTRAINT monthly_themes_month_check
        CHECK (month BETWEEN 1 AND 12),

    CONSTRAINT monthly_themes_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT monthly_themes_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT monthly_themes_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT monthly_themes_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 3. Daily Devotionals
-- -----------------------------------------------------

CREATE TABLE public.devotionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    monthly_theme_id UUID,

    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL UNIQUE,

    date DATE NOT NULL,

    bible_verse VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,

    reflection TEXT,
    prayer TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT devotionals_monthly_theme_fk
        FOREIGN KEY (monthly_theme_id)
        REFERENCES public.monthly_themes(id)
        ON DELETE RESTRICT,

    CONSTRAINT devotionals_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT devotionals_slug_format
        CHECK (
            slug = lower(btrim(slug))
            AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
        ),

    CONSTRAINT devotionals_bible_verse_not_empty
        CHECK (length(btrim(bible_verse)) > 0),

    CONSTRAINT devotionals_content_not_empty
        CHECK (length(btrim(content)) > 0),

    CONSTRAINT devotionals_status_check
        CHECK (
            status IN (
                'DRAFT',
                'SCHEDULED',
                'PUBLISHED',
                'ARCHIVED'
            )
        ),

    CONSTRAINT devotionals_scheduled_check
        CHECK (
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT devotionals_published_check
        CHECK (
            status <> 'PUBLISHED'
            OR published_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 4. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_annual_themes_status
    ON public.annual_themes(status);

CREATE INDEX idx_monthly_themes_status
    ON public.monthly_themes(status);

CREATE INDEX idx_devotionals_monthly_theme
    ON public.devotionals(monthly_theme_id);

CREATE INDEX idx_devotionals_status_date
    ON public.devotionals(status, date DESC);

CREATE INDEX idx_devotionals_published_at
    ON public.devotionals(published_at DESC)
    WHERE status = 'PUBLISHED';

-- -----------------------------------------------------
-- 5. Automatic updated_at triggers
-- -----------------------------------------------------

CREATE TRIGGER trg_annual_themes_updated_at
BEFORE UPDATE ON public.annual_themes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_monthly_themes_updated_at
BEFORE UPDATE ON public.monthly_themes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_devotionals_updated_at
BEFORE UPDATE ON public.devotionals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 6. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('005_themes_and_devotionals');

COMMIT;
