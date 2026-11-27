# Database

Supabase PostgreSQL 17, accessed exclusively through Prisma 6 from the Express backend.
**Owner: Role 2 (Backend core + Database).** Everyone else asks Role 2 for schema changes.

## The 8 entities

| Table | Purpose |
|---|---|
| `users` | Attendees (students, faculty, visitors), Organizers, Admins. `role` is a `UserRole` enum, default `ATTENDEE`. |
| `venues` | Halls and rooms, with a capacity. |
| `categories` | Workshop, Seminar, Competition, Cultural, Sports. `name` is unique. |
| `events` | The event itself, with organizer, venue, category and an `EventStatus`. |
| `registrations` | One seat booking, its QR code and check-in time. Unique on `(eventId, userId)`. |
| `feedbacks` | Rating 1..5 after an event. Unique on `(eventId, userId)`. |
| `notifications` | One row per recipient; a broadcast creates one row per user. |
| `chat_sessions` | AI assistant conversation history (FR-23). |

Prisma also maintains `_prisma_migrations` for its own bookkeeping.

## Connection strings

Two URLs live in `.env` at the repo root (never committed):

- **`DATABASE_URL`** — the pooled connection (port `6543`, `?pgbouncer=true`). Used by the app at runtime.
- **`DIRECT_URL`** — a session connection (port `5432`). Used **only** by `prisma migrate`, which needs
  to run DDL in a real session that a transaction pooler cannot provide.

If `prisma migrate` fails with **P1001** against `db.<ref>.supabase.co`, switch `DIRECT_URL` to the
Supabase **Session pooler** string — it is IPv4-friendly and works on networks without IPv6.

### Why migrations run through an npm script

The Prisma CLI only auto-loads a `.env` from the directory it runs in (`backend/`) or from
`backend/prisma/`. Our `.env` lives at the **repo root**, so a bare `npx prisma migrate dev` fails with
`P1012 Environment variable not found: DIRECT_URL`. Use the scripts instead — they pass the root
`.env` through `dotenv-cli`:

```bash
cd backend
npm run prisma:migrate -- --name what_changed   # create + apply a migration (development)
npm run prisma:deploy                           # apply pending migrations (production / CI)
npm run prisma:studio                           # browse the data
npm run db:seed                                 # seed reference data + the first ADMIN
```

## Row Level Security: enabled on all 8 tables, with no policies

This is deliberate. Read this before you "fix" it.

Supabase publishes **every table in the `public` schema** through its auto-generated Data API
(PostgREST), reachable with the project's `anon` key. That key is a public, client-side value — it ships
in browsers. Without RLS, anyone holding it could read and modify every row in `users`, `events`,
`registrations` and the rest **directly, completely bypassing our Express API** and every check in it.

Migration `20260929192816_enable_rls` runs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 8
application tables and creates **zero policies**. In PostgreSQL, RLS is deny-by-default: with the
feature on and no policy granting access, the `anon` and `authenticated` roles can read nothing and
write nothing. The public Data API is effectively closed.

Our backend is unaffected. Prisma connects as the privileged `postgres` role, which carries the
`BYPASSRLS` attribute, so every query from the API keeps working exactly as before.

**RLS here is a second safety net, not our access-control layer.** Real authorization lives in the API —
`requireAuth` and `requireRole` in `backend/src/middleware`. This resolves open decision #2 in the
README: we keep custom auth (bcrypt + JWT, as the NFRs require) *and* satisfy the NFR that asks for
RLS, without pretending RLS is doing the authorization.

Consequences to know about:

- Supabase's linter will report `rls_enabled_no_policy` (severity **INFO**) for all 8 tables. Expected.
- The Supabase **Table Editor** may show no rows even though data exists — it reads through the Data
  API. Use `npm run prisma:studio`, or the SQL Editor, which runs privileged.
- If we ever add a Supabase client in the browser, each table will need explicit policies written and
  reviewed first. That is a deliberate decision, never a default.

### Known gap: `_prisma_migrations`

`_prisma_migrations` still has RLS **disabled**, so Supabase's linter reports
`rls_disabled_in_public` at **ERROR** severity. It holds no user data — only migration names,
checksums and timestamps — but it is readable with the anon key. Enabling RLS on it is safe
(Prisma bypasses RLS), and is a one-line migration if we decide to close it:

```sql
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
```

## Seeding

`backend/prisma/seed.js` is **idempotent** — run it as often as you like:

- 5 categories (Workshop, Seminar, Competition, Cultural, Sports) — upserted on the unique `name`.
- 3 venues — matched on `name` + `building`, since `venues` has no unique column.
- 1 `ADMIN` user from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, password hashed with bcrypt
  (cost factor from `BCRYPT_ROUNDS`, default 12).

The seed **never overwrites an existing admin's password** — if the account is already there it only
re-asserts `role = ADMIN` and `isActive = true`. Raw passwords are never logged. The script fails fast
with a clear message if the two `SEED_ADMIN_*` variables are missing or the password is under 8
characters.

## Rules

1. Every schema change goes through a Prisma migration. Never edit the database by hand, and never
   through the Supabase MCP or dashboard — the migration history is the single source of truth.
2. Never run `prisma migrate reset` against the shared database. It drops everything.
3. Commit the generated `prisma/migrations/` folder.
4. Never create a second `PrismaClient` — always `require('../../lib/prisma')`.
