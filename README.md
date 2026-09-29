# Smart Campus Event Manager System (SCEMS)
# نظام إدارة فعاليات الحرم الجامعي الذكي

University of Hail — CSCE480 — Graduation Project 2.

## 📌 Project Overview | نبذة عن المشروع
SCEMS is an innovative, centralized digital platform designed to revolutionize university event organization.
نظام (SCEMS) هو منصة رقمية مركزية مبتكرة مصممة لتطوير وتنظيم الفعاليات داخل الحرم الجامعي.

The system serves three roles: **Attendee** (students, faculty, visitors), **Organizer**, and **Admin**.
It covers 23 functional requirements (FR-01..FR-23) and 16 non-functional requirements.

## 👥 The Team | الفريق
* **Team Leader:** Rayan Khaled Alharbi
* **Team Members (أعضاء الفريق):**
  * TURKI NASSER ALANZI
  * Abdullah yousef alsaqabi
  * Turki Mansour Al-Shammari
  * Abdulrahman Adwan Alanazi
  * Majed Awad ALRASHIDI
  * Abdulaziz Mohammed Almehihi
  * Turki saleh Al-shammari

## 🎓 Supervision | الإشراف
**Supervisor:** Dr. Mohamed Hazber

## 🚀 Key Features | المميزات الأساسية
* **AI Assistant (FR-23):** Conversational help for finding events, powered by the Anthropic Claude API.
  (مساعد ذكي للبحث عن الفعاليات والإجابة على الاستفسارات)
* **AI Recommendation:** Personalized event suggestions.
  (توصيات ذكية للفعاليات بناءً على اهتمامات الحضور)
* **QR-Based Attendance:** Digital sign-in system.
  (نظام تحضير رقمي باستخدام كود QR)
* **Attendance Prediction:** Forecast turnout using AI.
  (التنبؤ بعدد الحضور باستخدام الذكاء الاصطناعي)
* **Bilingual UI:** Arabic (RTL) by default, English (LTR) second.
  (واجهة ثنائية اللغة: العربية افتراضياً مع دعم الاتجاه من اليمين لليسار)

## 📂 Repository layout
```
scems/
  backend/     Node.js + Express API, Prisma schema (Supabase Postgres)
  frontend/    Next.js (Arabic RTL default + English), Tailwind
  analytics/   Python (FastAPI, pandas, scikit-learn)
  docs/        Roadmap, SRS, use cases
  CLAUDE.md    Rules every teammate's AI tool follows (read it!)
```

## Get started (each teammate)
1. `git clone https://github.com/CEMS-UOH/CEMS-Main.git` and `git checkout develop`
2. `cp .env.example .env` and fill it in (ask the Leader for the Supabase strings; never commit `.env`)
3. Backend: `cd backend && npm install && npm run dev` -> http://localhost:5000/health
4. Frontend: `cd frontend && cp .env.example .env.local && npm install && npm run dev` -> http://localhost:3000
   (the home page shows "Server is up" when the frontend can reach the backend)
5. Read `CLAUDE.md`, then create your branch: `git checkout -b feature/<module>-<name>`

### Windows note
`next-intl` depends on `@swc/core`, whose native loader refuses to run if any untrusted account has
write access to the folder tree it caches its binary in. If `npm run build` fails in `frontend/` with
`Failed to load native binding`, point the cache at a directory with tight permissions:

```powershell
# one-time, per machine
New-Item -ItemType Directory -Path C:\swc-cache -Force
[Environment]::SetEnvironmentVariable("SWC_NATIVE_BINDING_CACHE", "C:\swc-cache", "User")
```

Then open a new terminal. Linux/macOS, CI, and Vercel are not affected.

## One-time setup (Leader / Role 2 / Role 8)
- Leader: create `develop` from `main`; on GitHub enable branch protection on `main` and `develop` (require PR + passing CI).
- Role 2: **done.** The 8 tables are migrated and Row Level Security is enabled on all of them
  (no policies - deny by default over Supabase's public Data API). Run `cd backend && npm run db:seed`
  to load the 5 categories, 3 venues and the first ADMIN account. See `docs/DATABASE.md` for the
  migration workflow, the RLS decision and the P1001 tip.
- Role 4: run `npx shadcn@latest init` once inside `frontend/` and commit, so everyone shares the same UI component setup.
- Role 8: connect Vercel to `frontend/`, set up the DigitalOcean droplet, run `docker compose up -d --build` there (see `docker-compose.yml`).

## Open decisions (settle in the first meeting)
1. **Mobile:** the official NFR mentions React Native; we build a responsive web app instead. Get the supervisor's written OK.
2. **Auth vs RLS:** NFRs say bcrypt + JWT (custom auth) and Row-Level Security. Prisma connects with a privileged role that bypasses RLS, so real access control must live in the API. RLS is enabled as a second safety net — see `docs/DATABASE.md`.
3. **Feedback screen:** the 17 screens include Feedback/Rating but no FR covers it. Ask the supervisor which FR it belongs to.
4. **Domain:** buy it and set `app.` (Vercel) and `api.` (DigitalOcean) subdomains; set `CORS_ORIGINS` to the app URL.

## Foundation status

The foundation is complete: **FR-01 (registration)** and **FR-02 (login for all roles)** work
end to end, Supabase -> Express -> Next.js, in Arabic (RTL) and English (LTR).

| Endpoint | Method | Purpose |
|---|---|---|
| `/health`, `/health/db` | GET | Liveness and database checks |
| `/api/attendee/auth/register` | POST | FR-01. Always creates an ATTENDEE. |
| `/api/attendee/auth/login` | POST | FR-02. Sets an httpOnly JWT cookie (7 days). |
| `/api/attendee/auth/logout` | POST | Clears the cookie. |
| `/api/attendee/auth/me` | GET | Current user. Protected. |

Frontend routes: `/[locale]/register`, `/[locale]/login`, `/[locale]/me`.
Shared frontend helpers live in `frontend/lib/api.ts` - always use it instead of calling
`fetch` directly, so `credentials: "include"` and the `ok()`/`fail()` envelope stay consistent.

## Known limitations

Honest list of what the foundation does **not** do yet. None of these block the next FRs.

**Authentication**
1. **Registration is not restricted to a university email domain.** Any syntactically valid
   email is accepted, so anyone can create an Attendee account. FR-01 says "register with the
   university email", so before the final demo we should either enforce a domain allowlist or
   get the supervisor's written agreement that open registration is acceptable.
2. **No email verification** - addresses are never confirmed to exist or belong to the user.
3. **No password reset / forgot-password flow.**
4. **No rate limiting or lockout on login**, so the endpoint is open to brute-force guessing.
   Worth adding `express-rate-limit` before the load test in Sprint 5.
5. **No server-side token revocation.** Logout clears the cookie, but the JWT itself stays
   valid until it expires (7 days). A token copied before logout would still work. Mitigated
   by `requireAuth` re-loading the user each request, so deactivating an account via
   `isActive` takes effect immediately.
6. **Organizer and Admin accounts cannot be created through the UI yet** - only by the seed or
   directly in the database. That is FR-18 (Admin user management).

**Database**
7. **RLS is enabled with no policies on purpose.** A side effect is that Supabase's **Table
   Editor shows tables as empty** even when they hold rows, because it reads through the Data
   API. Use `cd backend && npm run prisma:studio` or the SQL Editor. Supabase's linter will
   also keep reporting `rls_enabled_no_policy` at INFO severity. See `docs/DATABASE.md`.
8. **Test accounts are still in the database** (`phase3.*`, `phase4.*`, `phase5.*` at
   `example.com`). Delete them before the final submission.
9. The Prisma seed is configured via `package.json#prisma`, which Prisma deprecates and will
   remove in Prisma 7. We are on Prisma 6; migrating to `prisma.config.ts` is a later chore.

**Dependencies and tooling**
10. `npm audit` reports **1 high + 1 moderate** in the frontend (`postcss`, pulled in by Next
    15.5.26). The only fix is Next 16, which contradicts our pinned Next 15 stack, so we are
    accepting it for now.
11. `npm audit` reports **3 high** in the backend, all inside the `prisma` **CLI**
    devDependency (`@prisma/config` -> `deepmerge-ts`). Not in the runtime path - it cannot be
    reached by a request.
12. **Windows only:** `next-intl` depends on `@swc/core`, whose native loader refuses to run if
    an untrusted account can write to the directory tree it caches its binary in. See the
    Windows note under "Get started".
13. `backend/Dockerfile` runs `npm ci --omit=dev` and then `npx prisma generate`, but `prisma`
    is a devDependency - so the CLI is omitted and npx tries to download it during the build.
    To be fixed in the deployment pass (move `prisma` into `dependencies`).

**Scope**
14. The official NFR mentions a **React Native** mobile app; we build a responsive web app
    instead (open decision #1).
15. No E2E tests yet (Playwright is planned for Sprint 6). Backend has 26 Jest/Supertest tests;
    the frontend has none.

## Roles
1 Leader/Architecture - 2 Backend core + DB - 3 Backend organizer/AI - 4 Frontend attendee - 5 Frontend dashboards - 6 Data analytics - 7 UI/UX + docs - 8 QA + DevOps.
Task board: see the Notion database "SCEMS - GP2 Task Board".
