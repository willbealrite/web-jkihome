-- =====================================================
-- Migration: 002_admins
-- Project: JKI Home Church
-- Description: Tabel akun Admin
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Admin accounts
-- -----------------------------------------------------

CREATE TABLE public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    password_changed_at TIMESTAMPTZ,

    -- Memastikan maksimal satu akun Admin
    singleton_key SMALLINT NOT NULL DEFAULT 1,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT admins_name_not_empty
        CHECK (length(btrim(name)) > 0),

    CONSTRAINT admins_email_normalized
        CHECK (
            email = lower(btrim(email))
            AND length(email) > 0
        ),

    CONSTRAINT admins_singleton_key_unique
        UNIQUE (singleton_key),

    CONSTRAINT admins_singleton_key_check
        CHECK (singleton_key = 1)
);

-- -----------------------------------------------------
-- 2. Automatic updated_at
-- -----------------------------------------------------

CREATE TRIGGER trg_admins_updated_at
BEFORE UPDATE ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------
-- 3. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('002_admins');

COMMIT;
