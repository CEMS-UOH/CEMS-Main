# Software Requirements Specification

**Smart Campus Event Manager System (SCEMS)**, University of Ha'il, CSCE480 (Graduation Project 2).
**Owner:** Role 7. **Status:** DRAFT. Based on the GP1 Final Report (Ch. 6, 7, 11, 12, Appendix H), updated to match
the decisions in `CLAUDE.md`, `README.md` and `docs/DATABASE.md`. Items marked **[OPEN]** wait for the Leader or supervisor
(see §7). Every change from GP1 is listed in `docs/SRS-GAP-REVIEW.md`.

## 1. Introduction

### 1.1 Purpose
Campus events at the University of Ha'il are announced through WhatsApp groups, social media and notice boards.
Attendees miss events, Organizers track registrations by hand, and Admins have no attendance data.
SCEMS is one web platform for the whole event lifecycle: creation, approval, booking, QR check-in and analytics.

### 1.2 Scope
- Responsive bilingual web application: Arabic (RTL, default) and English (LTR).
- Three user roles: **Attendee**, **Organizer**, **Admin**.
- 23 functional requirements (FR-01..FR-23) and 16 non-functional requirements (NFR-01..NFR-16).
- Out of scope: a native mobile app **[OPEN-1]**.

### 1.3 Users

| Role | Who | Main tasks |
|---|---|---|
| Attendee | Students, faculty, staff and visitors | Register, browse and filter events, book a seat, get a QR ticket, cancel, view history, use the AI assistant. |
| Organizer | Department and club staff | Create, edit and delete events, set capacity, add image and attachment links, view registered Attendees, check them in by QR. |
| Admin | University IT / event office | Approve or reject events, manage accounts and categories, view analytics, broadcast notifications, remove content. |

Anyone can self-register as an **Attendee** or an **Organizer**; nobody can self-register as an Admin.
An Organizer gives a phone number (required) and the club or department they represent (optional), and has no
account approval step: the gate is the event itself (FR-17). Until their first event is approved, a self-registered
Organizer may have only **one** pending event request. Admins create Admin accounts (FR-18).

## 2. Overall description

### 2.1 System perspective
Three-tier architecture:

| Tier | Technology |
|---|---|
| Presentation | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + next-intl, with the team's own shared components (`frontend/components`). Hosted on Vercel. |
| Application | Node.js + Express REST API (modules: attendee, organizer, admin, chatbot). Python FastAPI analytics service (pandas, scikit-learn). Grok (xAI) API for FR-23, called **only** from the backend (Leader decision; GP1 named the Anthropic Claude API). Hosted on DigitalOcean (Docker, NGINX, Certbot). |
| Data | Supabase PostgreSQL, accessed only through Prisma from the backend. |

The browser talks only to the backend API. It never reaches the database or the AI provider directly.

### 2.2 Security model
- Passwords hashed with bcrypt. Sessions are a JWT in an httpOnly cookie (7 days).
- **Authorization lives in the API** (`requireAuth`, `requireRole`). Row-Level Security is enabled on every table with
  no policies, as a deny-by-default safety net over Supabase's public Data API. It is not the access-control layer
  (`docs/DATABASE.md`).

### 2.3 Data model (summary)
Eight tables: `users` (with optional `phone` and `organization` for Organizers), `venues`, `categories`, `events`, `registrations`, `feedbacks`, `notifications`, `chat_sessions`.
Roles are a `role` column on `users` (`ATTENDEE`, `ORGANIZER`, `ADMIN`), not separate tables.
Check-in is `registrations.checkedInAt`; reports are computed by the analytics service. Full detail: `docs/DATABASE.md`.

## 3. Functional requirements

Priority from GP1. Status as of `develop` on 13 Oct 2026 (after PR #13). **Done** = API and screens both exist;
**API done** = the backend exists, the screen does not yet; **Partly done** = the note says what is missing.

| ID | Requirement | Module | Priority | Status |
|---|---|---|---|---|
| FR-01 | The system shall allow users to register as an Attendee or an Organizer (Organizers give a phone number). Nobody can self-register as an Admin. **[OPEN-2]** | Attendee | High | Done (any email accepted for now) |
| FR-02 | The system shall provide secure login for all user roles and send each role to its own area. | All | High | Done |
| FR-03 | The system shall display all approved campus events to Attendees. | Attendee | High | Done |
| FR-04 | The system shall allow Attendees to filter events by category, venue and day. | Attendee | Medium | Done |
| FR-05 | The system shall allow Attendees to book a seat for an available event and receive a QR code. Double booking and overbooking are rejected. | Attendee | High | Done |
| FR-06 | The system shall send a booking confirmation notification after a successful booking. | Attendee | High | Partly done: notification is stored, no notification screen yet |
| FR-07 | The system shall allow Attendees to cancel their own booking before the event starts. | Attendee | Medium | Done |
| FR-08 | The system shall provide Attendees with their full booking history. | Attendee | Medium | Done |
| FR-09 | The system shall display event details: description, date, venue and remaining capacity. | Attendee | High | Done |
| FR-10 | The system shall allow Organizers to create events. New events start as `PENDING` until an Admin approves them. A self-registered Organizer may have one pending request until their first approval. **[OPEN-6]** | Organizer | High | Done |
| FR-11 | The system shall allow Organizers to edit their own events before they start. | Organizer | High | Done |
| FR-12 | The system shall allow Organizers to delete their own events before they start, if no seats are booked. | Organizer | Medium | Done |
| FR-13 | The system shall allow Organizers to set a maximum capacity per event, no larger than the venue and no smaller than the seats already booked. | Organizer | High | Done |
| FR-14 | The system shall provide Organizers with the list of registered Attendees per event and record check-in by QR scan. **[OPEN-4]** | Organizer | High | Partly done: list done, QR check-in not built |
| FR-15 | The system shall notify Organizers when an event reaches maximum capacity. | Organizer | Medium | Partly done: notification is stored, no notification screen yet |
| FR-16 | The system shall allow Organizers to add an image and up to 10 attachments to their events (as links for now). | Organizer | Low | Done (links, not file upload) |
| FR-17 | The system shall allow Admins to approve or reject events submitted by Organizers. | Admin | High | Done |
| FR-18 | The system shall allow Admins to manage user accounts: create Organizer/Admin accounts, change roles, activate and deactivate, and see each Organizer's phone and organization. | Admin | High | Done |
| FR-19 | The system shall allow Admins to create, edit and delete event categories. | Admin | Medium | Done |
| FR-20 | The system shall provide Admins with a system-wide analytics dashboard, including attendance trends and a predicted turnout for new events. | Admin | High | Planned (analytics service has a health check only) |
| FR-21 | The system shall allow Admins to send broadcast notifications to all users. | Admin | Medium | Partly done: sending done, no screen for users to read them |
| FR-22 | The system shall allow Admins to delete any event or user account that breaks the rules. | Admin | High | Done |
| FR-23 | The system shall provide an AI assistant, powered by the Grok (xAI) API, to help users find events, answer questions and perform quick actions after explicit confirmation. | All | Medium | API done, chat screen not built |

Not yet covered by any FR **[OPEN-3]**: post-event feedback/rating (Role 4 built the form against a proposed
`POST /api/attendee/events/:id/feedback`; the API does not exist yet), AI event recommendations (README),
waitlist (GP1 Screen 5), password reset (GP1 Screen 1).

Still to build across the system: a notification center (FR-06, FR-15, FR-21 are stored but nobody can read them),
QR check-in (FR-14), the chat screen (FR-23) and the analytics dashboard (FR-20).

## 4. Non-functional requirements

| ID | Category | Requirement | Priority |
|---|---|---|---|
| NFR-01 | Performance | Pages load within 3 seconds under normal conditions. | High |
| NFR-02 | Performance | Support 500 concurrent users without degradation (load test in Sprint 5). | High |
| NFR-03 | Performance | A booking completes within 2 seconds. | Medium |
| NFR-04 | Security | Passwords are hashed with bcrypt before storage. | High |
| NFR-05 | Security | Sessions use JWT, stored in an httpOnly cookie. | High |
| NFR-06 | Security | Every feature is restricted to authorized roles, enforced in the API. | High |
| NFR-07 | Security | Protection against SQL injection (Prisma parameterized queries) and XSS. | High |
| NFR-08 | Usability | Fully responsive on desktop, tablet and mobile. | High |
| NFR-09 | Usability | Clear, translated error messages for every API error code. | Medium |
| NFR-10 | Usability | Consistent UI on all screens, following `docs/DESIGN-SYSTEM.md`. | Medium |
| NFR-11 | Compatibility | Works on current Chrome, Edge, Safari and Firefox. | High |
| NFR-12 | Compatibility | Works in mobile browsers on Android and iOS. (GP1: native React Native app.) **[OPEN-1]** | Medium |
| NFR-13 | Scalability | New modules can be added without major refactoring. | Medium |
| NFR-14 | Scalability | Handles growing datasets efficiently (indexed queries). | High |
| NFR-15 | Availability | 99% uptime during the academic year. | High |
| NFR-16 | Accessibility | Complies with WCAG 2.1 AA (contrast rules in `docs/DESIGN-SYSTEM.md`). | Low |

## 5. Use cases

Actors and their main use cases. The detailed use-case descriptions and diagrams are figures in the GP1 report
(Fig. 7.1, 7.2, Appendix J) and are carried over unchanged until they are redrawn.

| Actor | Use cases |
|---|---|
| Attendee | Register (FR-01), Log in (FR-02), Browse events (FR-03), Filter events (FR-04), View event details (FR-09), Book a seat (FR-05), Receive confirmation (FR-06), Cancel booking (FR-07), View booking history (FR-08), Chat with the AI assistant (FR-23) |
| Organizer | Register as Organizer (FR-01), Log in, Create event (FR-10), Set capacity (FR-13), Add image and attachment links (FR-16), Edit event (FR-11), Delete event (FR-12), View Attendees (FR-14), Check in by QR (FR-14), Receive capacity-full alert (FR-15) |
| Admin | Log in, Approve/Reject event (FR-17), Manage users (FR-18), Manage categories (FR-19), View analytics (FR-20), Broadcast notification (FR-21), Delete event or user (FR-22) |

Sequence diagrams to redraw for the web platform (GP1 used "Mobile App" and "Scanner App"):
SD-01 Attendee registration, SD-02 Create event + Admin approval, SD-03 Cancel booking,
SD-04 QR check-in **[OPEN-4]**, SD-05 AI assistant.

## 6. Interface requirements

- Screens are built directly in code under `frontend/app/[locale]` (no Figma before the midterm): home, login,
  register, Attendee events/details/bookings, Organizer dashboard/event form/attendees, Admin overview/events/users/
  categories/broadcast.
- Arabic RTL default, English LTR, language toggle on every screen.
- Visual rules: `docs/DESIGN-SYSTEM.md`, which documents the tokens in `frontend/app/globals.css`.

## 7. Open decisions

| # | Question | Ask |
|---|---|---|
| OPEN-1 | Drop the React Native app and rewrite NFR-12 for mobile browsers? | Supervisor (written OK) |
| OPEN-2 | Restrict FR-01 to the university email domain, or accept any email? | Supervisor |
| OPEN-3 | Which FR covers feedback/rating? Keep or drop recommendations, waitlist and password reset? | Leader + supervisor |
| OPEN-4 | Is the QR scanner a page inside the web app (Organizer, phone camera)? | Leader + Role 3 |
| OPEN-5 | Is this file the official SRS, or does a separate SRS document exist? | Leader |
| OPEN-6 | Add optional `titleEn` and `descriptionEn` to `events`, so the English interface can show an English title when the Organizer provides one (falls back to the main title)? Supports GP1's goal of serving external guests. Needs a schema change by Role 2, an update to the attendee and organizer APIs, and a field in the event form. | Leader + Role 2 |
