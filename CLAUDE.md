# SCEMS - Smart Campus Event Manager System

This file is read automatically by Claude Code. Follow it exactly. Every teammate's AI tool works from these same rules.

## Project
Web platform for managing events at the University of Hail (course CSCE480, Graduation Project 2).
Three user roles: Attendee, Organizer, Admin. 23 functional requirements (FR-01..FR-23) + 16 NFRs.

## Naming rules (never break)
- Always say **"Attendee"** - never "Student" (in code, UI text, docs, DB values).
- The product name is **"Smart Campus Event Manager System"**.

## Stack
- Frontend: Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + next-intl (Arabic RTL default, English LTR). Deployed on Vercel.
- Backend: Node.js + Express (CommonJS) + Prisma 6 -> Supabase Postgres. Deployed on DigitalOcean (Docker).
- Analytics: Python (FastAPI, pandas, scikit-learn). Deployed with the backend.
- AI assistant (FR-23): Grok (xAI) API, called from the backend only (never from the browser).
  Changed from the Anthropic Claude API named here originally - Leader override for
  feature/fr10to23-organizer-admin-chatbot, see backend/src/modules/chatbot/API.md.
- Tests: Jest + Supertest (backend), Playwright (E2E, later), Postman (API).

## Repo map and OWNERSHIP
Work only inside the folder you own. If your task needs a change elsewhere, stop and ask the owner (or the human you work for).

| Path | Owner |
|---|---|
| `backend/prisma/schema.prisma` | Role 2 ONLY |
| `backend/src/lib`, `middleware`, `config` (shared code) | Role 2 |
| `backend/src/modules/attendee` | Role 2 |
| `backend/src/modules/admin` | Role 3 for FR-17..FR-22 (Leader override, feature/fr10to23-organizer-admin-chatbot). Normally Role 2. |
| `backend/src/modules/organizer` | Role 3 |
| `backend/src/modules/chatbot` | Role 3 |
| `frontend/lib`, `frontend/components` (shared) | Role 1 + Role 4 (agree before changing) |
| `frontend/app/[locale]/{login,register,me}` (foundation auth) | Role 1 (Leader) |
| `frontend/app/[locale]/(attendee)`, AI chat UI | Role 4 |
| `frontend/app/[locale]/(organizer)`, `(admin)`, dashboard, notifications UI | Role 5 |
| `analytics/` | Role 6 |
| Figma, `docs/` (SRS, use cases) | Role 7 |
| `.github/`, `docker-compose.yml`, Dockerfiles, deployment, E2E tests | Role 8 |
| Architecture decisions, PR review, this file | Role 1 (Leader) |

## Rules for AI-assisted coding
1. Before writing anything, search the repo for existing code (especially `backend/src/lib`, `backend/src/middleware`, `frontend/lib` and `frontend/components`). Reuse it. Do not create a second helper that does the same thing.
2. **Never edit `backend/prisma/schema.prisma`** unless you are Role 2. Need a new column or table? Write the exact change you need in the PR description or ask Role 2.
3. Never create a new `PrismaClient`. Always `require('../../lib/prisma')`.
4. Every API response uses `ok()` / `fail()` from `backend/src/lib/response.js`:
   `{ success: true, data }` or `{ success: false, error: { message, code } }`. Throw `HttpError` for expected errors.
5. Validate all request input in the controller. Never trust the client. Passwords are hashed with bcrypt; sessions use JWT (NFRs).
   Authorization lives in the API, not in the database - RLS is enabled with no policies purely as a
   second safety net over Supabase's public Data API. See `docs/DATABASE.md` before changing it.
6. Never commit secrets. `.env` is git-ignored. Add new variables to `.env.example` (with a fake value).
7. UI text is never hardcoded. Add keys to BOTH `frontend/messages/ar.json` and `frontend/messages/en.json`.
8. Layout must work in RTL and LTR: use Tailwind logical classes (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`), never `ml-`, `mr-`, `left-`, `right-`.
9. The browser talks only to our backend, never directly to the database, and never to the AI provider (Grok/xAI, FR-23).
   Use `frontend/lib/api.ts` for every call - never a bare `fetch`. It sets `credentials: "include"`
   (required for the session cookie) and unwraps the `ok()`/`fail()` envelope. Show errors by the
   `code` the API returns, translated through the `Errors` namespace in `messages/*.json`.
10. Do not refactor, rename, or reformat code you do not own. Keep changes small and focused on your task.
11. Add or update tests for what you build (`backend/tests`). Use `jest.mock('../src/lib/prisma', ...)` like `health.test.js`.
12. If a requirement is unclear or your task seems to touch other roles' code: stop and ask. Do not guess.

## Git workflow
- `main` = stable/production. `develop` = integration. Nobody pushes directly to either.
- Branch from `develop`: `feature/<module>-<short-name>` (e.g. `feature/attendee-booking`).
- Pull `develop` into your branch at least every 1-2 days.
- Open a small Pull Request into `develop` early. CI must pass. The Leader (or module owner) reviews.
- Commit messages: `feat(attendee): add booking endpoint`, `fix(admin): ...`, `test(...)`, `docs(...)`.

## Commands
- Backend: `cd backend && npm install && npm run dev` | tests: `npm test`
- DB change (Role 2): edit schema, then `cd backend && npm run prisma:migrate -- --name <what_changed>`
  (not bare `npx prisma migrate dev` - our `.env` is at the repo root, which the Prisma CLI does not read. See `docs/DATABASE.md`)
- Seed reference data + first ADMIN: `cd backend && npm run db:seed`
- Frontend: `cd frontend && cp .env.example .env.local && npm install && npm run dev`
- Analytics: `cd analytics && pip install -r requirements.txt && uvicorn app.main:app --reload`
- Everything backend-side via Docker: `docker compose up --build`

## Definition of done
Feature works in Arabic and English, tests pass, no console errors, no secrets, PR description says which FR it covers.
