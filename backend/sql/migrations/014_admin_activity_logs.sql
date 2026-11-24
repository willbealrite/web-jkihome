-- =====================================================
-- Migration: 014_admin_activity_logs
-- Project: JKI Home Church
-- Description: Admin activity audit logs
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Admin Activity Logs
-- -----------------------------------------------------

CREATE TABLE public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_id UUID,

    action VARCHAR(50) NOT NULL,

    module VARCHAR(50) NOT NULL,

    entity_type VARCHAR(100),

    entity_id UUID,

    description TEXT NOT NULL,

    metadata JSONB,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- -------------------------------------------------
    -- Foreign Key
    -- -------------------------------------------------

    CONSTRAINT admin_activity_logs_admin_fk
        FOREIGN KEY (admin_id)
        REFERENCES public.admins(id)
        ON DELETE SET NULL,

    -- -------------------------------------------------
    -- Validation
    -- -------------------------------------------------

    CONSTRAINT admin_activity_logs_action_not_empty
        CHECK (length(btrim(action)) > 0),

    CONSTRAINT admin_activity_logs_module_not_empty
        CHECK (length(btrim(module)) > 0),

    CONSTRAINT admin_activity_logs_description_not_empty
        CHECK (length(btrim(description)) > 0)
);

-- -----------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_admin_activity_logs_created_at
    ON public.admin_activity_logs(created_at DESC);

CREATE INDEX idx_admin_activity_logs_admin_created
    ON public.admin_activity_logs(admin_id, created_at DESC);

CREATE INDEX idx_admin_activity_logs_module_created
    ON public.admin_activity_logs(module, created_at DESC);

CREATE INDEX idx_admin_activity_logs_action_created
    ON public.admin_activity_logs(action, created_at DESC);

CREATE INDEX idx_admin_activity_logs_entity
    ON public.admin_activity_logs(entity_type, entity_id);

-- -----------------------------------------------------
-- 3. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('014_admin_activity_logs');

COMMIT;
