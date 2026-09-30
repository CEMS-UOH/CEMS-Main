-- Enable RLS on Prisma's own bookkeeping table, with NO policies.
--
-- `_prisma_migrations` is not part of the Prisma schema, so it was left out of the
-- previous enable_rls migration. It lives in the `public` schema, which means Supabase
-- publishes it through the Data API: anyone with the project's public anon key could read
-- our migration names, checksums and timestamps. Supabase's linter reports this as
-- `rls_disabled_in_public` at ERROR severity.
--
-- No user data is exposed, but there is no reason to publish it either. Enabling RLS with
-- zero policies closes the Data API path. Prisma is unaffected: it connects as the
-- privileged `postgres` role, which has BYPASSRLS, so `migrate dev` / `migrate deploy`
-- continue to read and write this table normally.
--
-- The guard is required: `prisma migrate dev` replays every migration into a shadow
-- database, and `_prisma_migrations` does not exist there. A bare ALTER fails with P1014
-- / P3006. The IF EXISTS check makes this migration a no-op in the shadow database and
-- effective in the real one.
--
-- See docs/DATABASE.md for the full RLS rationale.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = '_prisma_migrations'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;
