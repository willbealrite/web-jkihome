BEGIN;

ALTER TABLE public.devotionals
ADD CONSTRAINT devotionals_date_unique UNIQUE (date);

INSERT INTO public.schema_migrations (migration_name)
VALUES ('016_unique_devotional_date.sql');

COMMIT;
