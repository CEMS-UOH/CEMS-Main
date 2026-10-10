# SRS Gap Review (draft)

**Owner:** Role 7 (UI/UX + requirements). **Status:** draft, waiting for the Leader to confirm which file is the official SRS.

**Source compared:** *SCEMS Graduation Project I — Final Report* (GP1, CSCE470): Ch. 6 (Requirements), Ch. 7 (Use Cases),
Ch. 8–9 (Class + Sequence diagrams), Ch. 10 (Database), Ch. 11 (UI Design), Ch. 12 (Architecture), Appendix H (FR table).

**Compared against:** `CLAUDE.md`, `README.md`, `docs/DATABASE.md`, `backend/prisma/schema.prisma`, and the foundation code on `develop`.

Each row says what the report claims, what the project actually does, and what the SRS update should say.
Items marked **Decision** need the Leader or supervisor before the SRS can be changed.

---

## 1. Platform and architecture

| # | Report says | Project actually | Proposed SRS update |
|---|---|---|---|
| 1.1 | React Native mobile app for Android + iOS (Abstract, §12.2.1, §12.4.2 Tier 1, **NFR-12**) | Responsive web app only (README open decision #1) | Replace React Native with responsive web. Rewrite NFR-12 as "works on mobile browsers (Android + iOS)". **Decision:** supervisor's written OK still pending. |
| 1.2 | Backend hosted on **Railway** (§12.3.2) | Backend in Docker on **DigitalOcean** with NGINX + Certbot (`docs/DEPLOY.md`) | Replace Railway with DigitalOcean (Docker). |
| 1.3 | "All queries are executed via the Supabase Client using SQL, with RLS policies enforcing role-based data access" (§12.4.2 Tier 3, §1.4, §12.4.3) | All queries go through **Prisma** from Express. RLS is enabled with **no policies**, only as a safety net. Real authorization is `requireAuth` / `requireRole` in the API (`docs/DATABASE.md`) | Say authorization lives in the API; RLS is a deny-by-default safety net over Supabase's public Data API. |
| 1.4 | Tier 1 uses **Zustand** and **shadcn/ui** (§12.4.2, §6.3.1) | Neither is installed yet. shadcn is planned (Role 4 runs `npx shadcn init`); Zustand is not mentioned anywhere | Keep shadcn/ui. **Decision:** confirm with Role 4 whether Zustand is used; drop it if not. |
| 1.5 | Frontend components tested with Jest (§12.4.3) | Backend: Jest + Supertest. Frontend: no unit tests; E2E with Playwright planned | Update the testing line to match `CLAUDE.md`. |
| 1.6 | Sequence diagrams use "Mobile App" (SD-01, SD-03) and a separate "Scanner App" (SD-04) | Web app only | Rename to "Web App" / "Browser". Diagram images need redrawing. **Decision:** is the QR scanner a page inside the web app? (the kickoff PDF says FR-14 has its own scan endpoint) |
| 1.7 | Five-week plan (Abstract) | 12 weeks / 6 sprints (`docs/ROADMAP.md`) | Use the GP2 roadmap; course code CSCE480. |

## 2. Functional requirements vs. what is built or planned

| # | Report says | Project actually | Proposed SRS update |
|---|---|---|---|
| 2.1 | FR-01: register **with a university email** | Any valid email is accepted (README known limitation #1) | **Decision:** enforce the `uoh.edu.sa` domain, or get the supervisor's OK and reword FR-01. |
| 2.2 | Register screen: first/last name, phone, **role dropdown (Attendee / Organizer)**, T&C checkbox (Screen 2) | One `fullName` field, no phone, role is **always ATTENDEE**; Organizers/Admins are created by an Admin (FR-18) | Update Screen 2 and FR-01: self-registration creates Attendees only. |
| 2.3 | Login screen has "Forgot Password?" (Screen 1) | No password reset flow (known limitation #3) | **Decision:** build it later or remove the link from the design. |
| 2.4 | Screen 5 shows a **waitlist** ("Join Waitlist") and labels it FR-07 | No FR covers a waitlist; FR-07 is *cancel booking*; no waitlist in the schema | Remove the waitlist, or add a new FR. Fix the FR-07 label either way. |
| 2.5 | Screen 8 (Feedback/Rating) mapped to FR-09 | FR-09 is *event details*. A `Feedback` table exists, but no FR covers it (README open decision #3) | **Decision:** supervisor to say which FR owns feedback; the kickoff PDF already gives the feedback form to Role 4. |
| 2.6 | Screen 15 maps notifications to FR-22 | FR-22 is *delete any event/user* | Fix the mapping (FR-06, FR-15, FR-21 only). |
| 2.7 | Notification types: Booking Confirmed, Event Reminder, New Attendees, Booking Cancelled, New Event, plus a preferences panel (Screen 15) | Schema types: `BOOKING_CONFIRMATION`, `CAPACITY_FULL`, `BROADCAST`, `SYSTEM`; no preferences | Align the screen with the schema, or ask Role 2 for new types. |
| 2.8 | Categories: Academic, Career, Cultural, Sports (Screens 3, 14) | Seeded: Workshop, Seminar, Competition, Cultural, Sports | Use the seeded list in screens and examples. |
| 2.9 | Booking ticket has a **seat number** (Screen 6) | No seat number in `Registration` | Remove the seat number, or ask Role 2. |
| 2.10 | Screen 4 filters by Date, Category, **Status**, Location | Kickoff PDF FR-04: category, date, venue. Attendees only see `APPROVED` events (FR-03) | Drop the Status filter for Attendees. |
| 2.11 | README lists "AI Recommendation" (personalized suggestions) | No FR covers it | **Decision:** add an FR or remove it from the feature list. |

## 3. Data model (Ch. 8 and Ch. 10)

| # | Report says | Project actually | Proposed SRS update |
|---|---|---|---|
| 3.1 | Attendee has `studentID`, `major`, `academicYear`; Organizer has `department`, `orgType`; Admin has `accessLevel` | `User` has `fullName`, `email`, `role`, `isActive` only | Simplify the class diagram to one `User` with a `role` enum. **Naming rule:** `studentID` breaks the "Attendee, never Student" rule. |
| 3.2 | IDs are `int` / `String` named `userID`, `eventID`, `regID`… | UUID `id` everywhere; `qrCode` (not `qrToken`), `checkedInAt`, `startsAt` / `endsAt` | Update attribute names to the schema. |
| 3.3 | Event `category : Enum` (§8.2) | `Category` is its own table (FK) | Match the schema (the report's §10.4 already does). |
| 3.4 | Separate `Attendance` and `Report` classes | Attendance = `Registration.checkedInAt`; reports derived by the analytics service | Note both as derived, not tables (§10.4 already agrees). |
| 3.5 | Notification has `eventID` FK (§10.4) | No `eventId` on `Notification`; it has `title` + `body` | Update the table. |

## 4. UI design system (Ch. 11)

| # | Report says | Project actually | Proposed SRS update |
|---|---|---|---|
| 4.1 | Navy `#1B2A4A`, Teal `#2A9D8F`, Success `#2ECC71`, Warning `#F39C12`, Danger `#E74C3C` | `globals.css` is a placeholder; no colors defined yet | Keep the palette. Share it with Roles 4 and 5 **before** they build screens so they use the same values. |
| 4.2 | "All 17 screens were designed in Figma" | Kickoff PDF: Figma skipped before the midterm; screens go straight to code | Say screens are built in code from the GP1 prototype (`SCEMS_UI_Prototype_17_Screens.html`). |

## 5. Design vs. the attendee API (PR #7, `backend/src/modules/attendee/API.md`)

Checked after Role 2 merged FR-03..FR-09. The prototype was updated to match; these are the decisions that came out of it.

| # | Design had | API does | Resolution |
|---|---|---|---|
| 5.1 | Text search box on the events feed | No text search (`category`, `venue`, `date` only), matching FR-04 | Search box removed from the prototype. If wanted, Role 2 adds a `q` parameter first. |
| 5.2 | "This week" / "This month" date filter | One campus day, `date=YYYY-MM-DD` | Single date picker with an "All dates" reset. |
| 5.3 | Create-event form asked for Arabic **and** English title/description | One `title` and one `description` | One field each; the text shows as written in both UI languages. |
| 5.4 | No state for an event the Organizer cancelled | `booking.event.status = CANCELLED` | New badge "Cancelled by organizer" in My bookings → Cancelled. |
| 5.5 | Generic "full" message | Error codes `EVENT_FULL`, `BOOKING_CLOSED`, … | Wording for all 9 codes in `docs/UX-COPY.md`. |

---

## Next steps

1. The Leader confirms the source file for the SRS and where it lives (`docs/SRS.md`?).
2. The items marked **Decision** go to the Leader or supervisor.
3. Once confirmed, write `docs/SRS.md` with the agreed updates.
4. Send the design system (4.1) to Roles 4 and 5 now. They are about to start building screens.
