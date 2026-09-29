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

## Roles
1 Leader/Architecture - 2 Backend core + DB - 3 Backend organizer/AI - 4 Frontend attendee - 5 Frontend dashboards - 6 Data analytics - 7 UI/UX + docs - 8 QA + DevOps.
Task board: see the Notion database "SCEMS - GP2 Task Board".
