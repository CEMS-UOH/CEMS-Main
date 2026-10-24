# Attendee API: events and bookings (FR-03..FR-09)

The JSON contract between the backend (Role 2) and the attendee frontend (Role 4).
Every response uses the standard envelope from `backend/src/lib/response.js`:
`{ success: true, data }` or `{ success: false, error: { message, code } }`.
Show errors by `code`, translated through the `Errors` namespace (CLAUDE.md rule 9).

All dates are ISO-8601 strings in UTC. All ids are UUIDs.

## Accounts - FR-01, FR-02

| Method and path | Body | Success `data` |
|---|---|---|
| `POST /api/attendee/auth/register` | `{ email, password, fullName, role?, phone?, organization? }` | `201 { user }` |
| `POST /api/attendee/auth/login` | `{ email, password }` | `{ user }` + session cookie |
| `POST /api/attendee/auth/logout` | — | `{ loggedOut: true }` |
| `GET /api/attendee/auth/me` | — | `{ user }` |

`user` is `{ id, email, fullName, role, phone, organization, isActive, createdAt }` - never the
password hash. `phone` and `organization` are `null` for everyone except self-registered
Organizers.

**Registering as an Organizer.** `role` is `"ATTENDEE"` (the default when omitted) or
`"ORGANIZER"`; anything else, including `"ADMIN"`, is `422 INVALID_ROLE` - admins are created
by the seed or by another admin (FR-18), never through this form.

- An Organizer must send `phone`: 8-15 digits with an optional leading `+`. Spaces, dashes and
  brackets are stripped and Arabic digits are converted before it is stored.
- `organization` (the club or department they represent) is optional, up to 120 characters.
- For an Attendee both fields are ignored and stored as `null`.

An Organizer account is usable immediately - there is no account approval step. The one gate
is the event: every event waits for an admin (FR-17), and a new Organizer may only have one
request waiting at a time (see `organizer/API.md`). The admin sees the Organizer's phone and
organization next to each request; attendees never do.

Extra error codes for registration: `INVALID_ROLE`, `INVALID_PHONE`, `INVALID_ORGANIZATION`
(all 422), alongside the existing `INVALID_EMAIL`, `WEAK_PASSWORD`, `INVALID_NAME` (422) and
`EMAIL_TAKEN` (409).

## Shapes

```ts
type Venue = { id: string; name: string; building: string | null; location: string | null };
type Category = { id: string; name: string };

type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: 'APPROVED';            // the attendee API only ever returns approved events
  imageUrl: string | null;
  category: Category;
  venue: Venue | null;
  organizer: { id: string; fullName: string };
  seatsTaken: number;            // CONFIRMED bookings only
  seatsLeft: number;             // never negative
  isFull: boolean;
};

type EventDetails = Event & { attachments: string[] };

type Booking = {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED';
  qrCode: string | null;         // null once cancelled; render it as a QR image on the ticket
  checkedInAt: string | null;
  createdAt: string;
  canCancel: boolean;            // CONFIRMED and the event has not started: show the Cancel button
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'; // CANCELLED = organizer cancelled it
    imageUrl: string | null;
    category: Category;
    venue: Venue | null;
  };
};
```

## Endpoints

| FR | Method and path | Auth | Success `data` |
|---|---|---|---|
| FR-03, FR-04 | `GET /api/attendee/events` | public | `{ events: Event[], pagination: { page, limit, total, totalPages } }` |
| FR-09 | `GET /api/attendee/events/:id` | public | `{ event: EventDetails }` |
| FR-05, FR-06 | `POST /api/attendee/bookings` body `{ eventId }` | Attendee | `201 { booking: Booking }` |
| FR-08 | `GET /api/attendee/bookings?status=` | Attendee | `{ bookings: Booking[] }` |
| FR-07 | `POST /api/attendee/bookings/:id/cancel` | Attendee | `{ booking: Booking }` |
| Rating | `POST /api/attendee/events/:id/feedback` body `{ rating, comment? }` | Attendee | `201 { feedback: { id, rating, comment, createdAt } }` |

### `GET /events` query parameters (all optional)

| Param | Meaning |
|---|---|
| `category` | a category id |
| `venue` | a venue id |
| `date` | `YYYY-MM-DD`, a campus day (Asia/Riyadh, UTC+3). Matches events that overlap that day. |
| `page` | 1 or more, default 1 |
| `limit` | 1..50, default 20 |

Only APPROVED events that have not ended yet are listed, soonest first.

### Booking rules

- Booking (FR-05) creates the QR token and, in the same transaction, a `BOOKING_CONFIRMATION`
  notification (FR-06). Render that notification by its `type` in the reader's language;
  its `title` is the event title.
- Booking again after cancelling is allowed while seats remain; it gets a new QR code.
- `GET /bookings` returns the full history, newest event first. `status` is `CONFIRMED` or `CANCELLED`.
  Each booking also carries `myRating` (1..5, or `null`): the attendee's own rating of that event.

### Rating an event

- `rating` is a whole number 1..5; `comment` is optional, up to 1000 characters (blank = none).
- Open once the event has **ended**, to an attendee who held a **confirmed** seat
  (otherwise `409 FEEDBACK_NOT_OPEN`). One rating per attendee per event (`409 ALREADY_REVIEWED`).
- The organizer reads them through `GET /api/organizer/events/:id/feedback`.

## Error codes (add these to `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `INVALID_FILTER` | 422 | bad `category`, `venue`, `date` or `status` |
| `INVALID_PAGINATION` | 422 | bad `page` or `limit` |
| `EVENT_NOT_FOUND` | 404 | unknown, malformed, or not-approved event |
| `ALREADY_BOOKED` | 409 | the attendee already holds a seat |
| `EVENT_FULL` | 409 | no seats left |
| `BOOKING_CLOSED` | 409 | the event has already started |
| `BOOKING_NOT_FOUND` | 404 | unknown booking, or someone else's |
| `ALREADY_CANCELLED` | 409 | cancelling twice |
| `CANCELLATION_CLOSED` | 409 | cancelling after the event started |
| `INVALID_RATING` | 422 | `rating` is not a whole number from 1 to 5 |
| `INVALID_COMMENT` | 422 | `comment` is not text, or longer than 1000 characters |
| `FEEDBACK_NOT_OPEN` | 409 | the event has not ended, or the attendee held no confirmed seat |
| `ALREADY_REVIEWED` | 409 | the attendee already rated this event |

The existing `UNAUTHENTICATED` (401) and `FORBIDDEN` (403, for Organizers and Admins on
`/bookings`) also apply.
