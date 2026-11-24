-- =====================================================
-- Migration: 003_admin_sessions_and_refresh_tokens
-- Project: JKI Home Church
-- Description: Sesi login dan refresh token Admin
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Admin sessions
-- -----------------------------------------------------

CREATE TABLE public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_id UUID NOT NULL,

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    revoked_at TIMESTAMPTZ,
    revoke_reason VARCHAR(100),

    CONSTRAINT admin_sessions_admin_fk
        FOREIGN KEY (admin_id)
        REFERENCES public.admins(id)
        ON DELETE RESTRICT,

    CONSTRAINT admin_sessions_expiry_check
        CHECK (expires_at > created_at),

    CONSTRAINT admin_sessions_last_used_check
        CHECK (last_used_at >= created_at),

    CONSTRAINT admin_sessions_revoked_check
        CHECK (
            revoked_at IS NULL
            OR revoked_at >= created_at
        )
);

-- -----------------------------------------------------
-- 2. Admin refresh tokens
-- -----------------------------------------------------

CREATE TABLE public.admin_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL,

    token_hash VARCHAR(255) NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    consumed_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    replaced_by_token_id UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT admin_refresh_tokens_session_fk
        FOREIGN KEY (session_id)
        REFERENCES public.admin_sessions(id)
        ON DELETE RESTRICT,

    CONSTRAINT admin_refresh_tokens_expiry_check
        CHECK (expires_at > created_at),

    CONSTRAINT admin_refresh_tokens_consumed_check
        CHECK (
            consumed_at IS NULL
            OR consumed_at >= created_at
        ),

    CONSTRAINT admin_refresh_tokens_revoked_check
        CHECK (
            revoked_at IS NULL
            OR revoked_at >= created_at
        ),

    -- Memastikan ID dan session pasangan ini unik
    CONSTRAINT admin_refresh_tokens_id_session_unique
        UNIQUE (id, session_id),

    -- Memastikan token pengganti berasal dari sesi yang sama
    CONSTRAINT admin_refresh_tokens_replacement_fk
        FOREIGN KEY (replaced_by_token_id, session_id)
        REFERENCES public.admin_refresh_tokens(id, session_id)
        ON DELETE RESTRICT,

    -- Satu token pengganti hanya boleh menggantikan satu token
    CONSTRAINT admin_refresh_tokens_replacement_unique
        UNIQUE (replaced_by_token_id),

    CONSTRAINT admin_refresh_tokens_no_self_replacement
        CHECK (
            replaced_by_token_id IS NULL
            OR replaced_by_token_id <> id
        ),

    CONSTRAINT admin_refresh_tokens_consumed_before_replacement
        CHECK (
            replaced_by_token_id IS NULL
            OR consumed_at IS NOT NULL
        )
);

-- -----------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------

CREATE INDEX idx_admin_sessions_admin_id
    ON public.admin_sessions(admin_id);

CREATE INDEX idx_admin_sessions_expires_at
    ON public.admin_sessions(expires_at);

CREATE INDEX idx_admin_sessions_revoked_at
    ON public.admin_sessions(revoked_at);

CREATE INDEX idx_admin_refresh_tokens_session_id
    ON public.admin_refresh_tokens(session_id);

CREATE INDEX idx_admin_refresh_tokens_expires_at
    ON public.admin_refresh_tokens(expires_at);

-- -----------------------------------------------------
-- 4. Record migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('003_admin_sessions_and_refresh_tokens');

COMMIT;
