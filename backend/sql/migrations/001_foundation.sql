-- =====================================================
-- Migration: 001_foundation
-- Project: JKI Home Church
-- Description: Fondasi awal database dan fungsi umum
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Migration tracking
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- 2. Common updated_at trigger function
-- -----------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- -----------------------------------------------------
-- 3. Record migration
-- -----------------------------------------------------

INSERT INTO schema_migrations (migration_name)
VALUES ('001_foundation');

COMMIT;
