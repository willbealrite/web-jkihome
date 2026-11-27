-- =====================================================
-- 018. Media Deletion Lifecycle
-- Durable deletion retry scheduling and worker claiming
-- =====================================================

BEGIN;

-- -----------------------------------------------------
-- 1. Deletion Retry Scheduling
-- -----------------------------------------------------

ALTER TABLE public.media
ADD COLUMN deletion_next_retry_at TIMESTAMPTZ;

-- Existing pending media must be eligible for processing
UPDATE public.media
SET deletion_next_retry_at = NOW()
WHERE status = 'DELETE_PENDING'
  AND deletion_next_retry_at IS NULL;


-- -----------------------------------------------------
-- 2. Worker Claim State
-- -----------------------------------------------------

ALTER TABLE public.media
ADD COLUMN deletion_claimed_at TIMESTAMPTZ,
ADD COLUMN deletion_claim_token UUID;


-- -----------------------------------------------------
-- 3. Claim State Validation
-- -----------------------------------------------------

ALTER TABLE public.media
ADD CONSTRAINT media_deletion_claim_state_check
CHECK (
  (deletion_claimed_at IS NULL AND deletion_claim_token IS NULL)
  OR
  (deletion_claimed_at IS NOT NULL AND deletion_claim_token IS NOT NULL)
);


-- -----------------------------------------------------
-- 4. Pending Deletion Worker Index
-- -----------------------------------------------------

CREATE INDEX media_deletion_worker_idx
ON public.media (deletion_next_retry_at ASC, created_at ASC)
WHERE status = 'DELETE_PENDING';

-- -----------------------------------------------------
-- 5. Record Migration
-- -----------------------------------------------------

INSERT INTO public.schema_migrations (migration_name)
VALUES ('018_media_deletion_lifecycle');

COMMIT;
