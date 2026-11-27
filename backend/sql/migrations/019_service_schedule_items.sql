-- =====================================================
-- Migration: 019_service_schedule_items
-- Project: JKI Home Church
-- Description: Simple recurring service schedule items
-- =====================================================

BEGIN;

CREATE TABLE public.service_schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    schedule_info TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT service_schedule_items_title_not_empty
        CHECK (length(btrim(title)) > 0),

    CONSTRAINT service_schedule_items_info_not_empty
        CHECK (length(btrim(schedule_info)) > 0),

    CONSTRAINT service_schedule_items_order_check
        CHECK (display_order >= 0)
);

CREATE INDEX service_schedule_items_public_order_idx
    ON public.service_schedule_items (display_order, id)
    WHERE is_active = TRUE;

CREATE INDEX service_schedule_items_admin_order_idx
    ON public.service_schedule_items (display_order, id);

INSERT INTO public.schema_migrations (migration_name)
VALUES ('019_service_schedule_items');

COMMIT;
