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
| Organizer | Department and club staff | Create, edit and delete events, set capacity, upload images, view registered Attendees, check them in by QR. |
| Admin | University IT / event office | Approve or reject events, manage accounts and categories, view analytics, broadcast notifications, remove content. |

Self-registration always creates an **Attendee**. Organizer and Admin accounts are created by an Admin (FR-18).

## 2. Overall description

### 2.1 System perspective
Three-tier architecture:

| Tier | Technology |
|---|---|
| Presentation | Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + next-intl. Hosted on Vercel. |
| Application | Node.js + Express REST API (modules: attendee, organizer, admin, chatbot). Python FastAPI analytics service (pandas, scikit-learn). Anthropic Claude API for FR-23, called **only** from the backend. Hosted on DigitalOcean (Docker, NGINX, Certbot). |
| Data | Supabase PostgreSQL, accessed only through Prisma from the backend. |

The browser talks only to the backend API. It never reaches the database or the Claude API directly.

### 2.2 Security model
- Passwords hashed with bcrypt. Sessions are a JWT in an httpOnly cookie (7 days).
- **Authorization lives in the API** (`requireAuth`, `requireRole`). Row-Level Security is enabled on every table with
  no policies, as a deny-by-default safety net over Supabase's public Data API. It is not the access-control layer
  (`docs/DATABASE.md`).

### 2.3 Data model (summary)
Eight tables: `users`, `venues`, `categories`, `events`, `registrations`, `feedbacks`, `notifications`, `chat_sessions`.
Roles are a `role` column on `users` (`ATTENDEE`, `ORGANIZER`, `ADMIN`), not separate tables.
Check-in is `registrations.checkedInAt`; reports are computed by the analytics service. Full detail: `docs/DATABASE.md`.

## 3. Functional requirements

Priority from GP1. Status as of `develop` after PR #7 (attendee APIs). "Backend done" means the API exists; the screens are still to build.

| ID | Requirement | Module | Priority | Status |
|---|---|---|---|---|
| FR-01 | The system shall allow users to register an Attendee account using a university email address. **[OPEN-2]** | Attendee | High | Done (any email accepted for now) |
| FR-02 | The system shall provide secure login for all user roles. | All | High | Done |
| FR-03 | The system shall display all approved campus events to Attendees. | Attendee | High | Backend done (PR #7) |
| FR-04 | The system shall allow Attendees to filter events by category, venue and day. | Attendee | Medium | Backend done (PR #7) |
| FR-05 | The system shall allow Attendees to book a seat for an available event and receive a QR code. Double booking and overbooking are rejected. | Attendee | High | Backend done (PR #7) |
| FR-06 | The system shall send a booking confirmation notification after a successful booking. | Attendee | High | Backend done (PR #7) |
| FR-07 | The system shall allow Attendees to cancel their own booking before the event starts. | Attendee | Medium | Backend done (PR #7) |
| FR-08 | The system shall provide Attendees with their full booking history. | Attendee | Medium | Backend done (PR #7) |
| FR-09 | The system shall display event details: description, date, venue and remaining capacity. | Attendee | High | Backend done (PR #7) |
| FR-10 | The system shall allow Organizers to create events. New events start as `PENDING` until an Admin approves them. | Organizer | High | Planned |
| FR-11 | The system shall allow Organizers to edit their own events. | Organizer | High | Planned |
| FR-12 | The system shall allow Organizers to delete their own events before the event date. | Organizer | Medium | Planned |
| FR-13 | The system shall allow Organizers to set a maximum capacity per event. | Organizer | High | Planned |
| FR-14 | The system shall provide Organizers with the list of registered Attendees per event and record check-in by QR scan. | Organizer | High | Planned |
| FR-15 | The system shall notify Organizers when an event reaches maximum capacity. | Organizer | Medium | Planned |
| FR-16 | The system shall allow Organizers to upload images and attachments for their events. | Organizer | Low | Planned |
| FR-17 | The system shall allow Admins to approve or reject events submitted by Organizers. | Admin | High | Planned |
| FR-18 | The system shall allow Admins to manage user accounts: create Organizer/Admin accounts, change roles, activate and deactivate. | Admin | High | Planned |
| FR-19 | The system shall allow Admins to create, edit and delete event categories. | Admin | Medium | Planned |
| FR-20 | The system shall provide Admins with a system-wide analytics dashboard, including attendance trends and a predicted turnout for new events. | Admin | High | Planned |
| FR-21 | The system shall allow Admins to send broadcast notifications to all users. | Admin | Medium | Planned |
| FR-22 | The system shall allow Admins to delete any event or user account that breaks the rules. | Admin | High | Planned |
| FR-23 | The system shall provide an AI assistant, powered by the Anthropic Claude API, to help users find events, answer questions and perform quick actions after explicit confirmation. | All | Medium | Planned |

Not yet covered by any FR **[OPEN-3]**: post-event feedback/rating (the `feedbacks` table and GP1 Screen 8),
AI event recommendations (README), waitlist (GP1 Screen 5), password reset (GP1 Screen 1).

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
| Organizer | Log in, Create event (FR-10), Set capacity (FR-13), Upload images (FR-16), Edit event (FR-11), Delete event (FR-12), View Attendees (FR-14), Check in by QR (FR-14), Receive capacity-full alert (FR-15) |
| Admin | Log in, Approve/Reject event (FR-17), Manage users (FR-18), Manage categories (FR-19), View analytics (FR-20), Broadcast notification (FR-21), Delete event or user (FR-22) |

Sequence diagrams to redraw for the web platform (GP1 used "Mobile App" and "Scanner App"):
SD-01 Attendee registration, SD-02 Create event + Admin approval, SD-03 Cancel booking,
SD-04 QR check-in **[OPEN-4]**, SD-05 AI assistant.

## 6. Interface requirements

- 17 screens from the GP1 prototype, built directly in code (no Figma before the midterm).
- Arabic RTL default, English LTR, language toggle on every screen.
- Visual rules: `docs/DESIGN-SYSTEM.md`.

## 7. Open decisions

| # | Question | Ask |
|---|---|---|
| OPEN-1 | Drop the React Native app and rewrite NFR-12 for mobile browsers? | Supervisor (written OK) |
| OPEN-2 | Restrict FR-01 to the university email domain, or accept any email? | Supervisor |
| OPEN-3 | Which FR covers feedback/rating? Keep or drop recommendations, waitlist and password reset? | Leader + supervisor |
| OPEN-4 | Is the QR scanner a page inside the web app (Organizer, phone camera)? | Leader + Role 3 |
| OPEN-5 | Is this file the official SRS, or does a separate SRS document exist? | Leader |
