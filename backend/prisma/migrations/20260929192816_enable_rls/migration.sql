-- Enable Row Level Security (RLS) on all 8 application tables, with NO policies.
--
-- WHY (see docs/DATABASE.md for the full explanation):
--   Supabase exposes every table in the `public` schema through its auto-generated
--   Data API (PostgREST) using the `anon` / `authenticated` roles. Anyone who has the
--   project's anon key -- which is a public, client-side value -- could otherwise read
--   and modify every row directly, bypassing our Express API entirely.
--
--   Enabling RLS with zero policies denies ALL access through those roles ("deny by
--   default"). Our backend is unaffected: Prisma connects as the privileged `postgres`
--   role, which has the BYPASSRLS attribute, so every query from our API keeps working.
--
--   Net effect: the only way into this data is through our Express API, where the real
--   authorization lives (requireAuth / requireRole). RLS is the second safety net that
--   NFR-Security asks for -- it is NOT our access-control layer.
--
-- If we ever add a Supabase client in the browser, each table will need explicit
-- policies before it can be read. That is a deliberate, reviewed decision, not a default.

ALTER TABLE "public"."users"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."venues"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."categories"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feedbacks"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_sessions" ENABLE ROW LEVEL SECURITY;
