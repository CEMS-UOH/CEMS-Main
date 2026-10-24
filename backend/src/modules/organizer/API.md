# Organizer API: own events, attendees, check-in, capacity (FR-10..FR-16)

The JSON contract between the backend (Role 3) and the organizer frontend (Role 5).
Every response uses the standard envelope from `backend/src/lib/response.js`:
`{ success: true, data }` or `{ success: false, error: { message, code } }`.
Show errors by `code`, translated through the `Errors` namespace (CLAUDE.md rule 9).

Every route requires a session cookie and the `ORGANIZER` role (`requireAuth` +
`requireRole('ORGANIZER')`). All dates are ISO-8601 strings in UTC. All ids are UUIDs.

## Not in the original FR list - added for usability

Three endpoints below (`GET /events`, `GET /events/:id`, and the venue/category lookups are
confirmed in the task) were not explicit FR bullets, but editing, deleting and viewing
attendees of "your own event" is not possible without some way to find that event's id first.
`GET /events` (list) and `GET /events/:id` (single) were added so the organizer frontend has
something to build a dashboard from. Flagged here and in the PR description - tell the Leader
if these should be removed.

## Shapes

```ts
type Venue = { id: string; name: string; building: string | null; location: string | null; capacity: number };
type Category = { id: string; name: string; description: string | null };

type OrganizerEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  imageUrl: string | null;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
  category: Category;
  venue: Venue | null;
  seatsTaken: number;     // CONFIRMED registrations only
  seatsLeft: number;      // never negative
  isFull: boolean;
  canEdit: boolean;       // status is PENDING/APPROVED AND the event has not started
  canDelete: boolean;     // the event has not started AND has 0 confirmed bookings
};

type Attendee = {
  id: string;              // registration id
  status: 'CONFIRMED' | 'CANCELLED';
  checkedInAt: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
  // No qrCode: that is the attendee's own ticket secret, never shown to the organizer.
};
```

## Endpoints

| FR | Method and path | Success `data` |
|---|---|---|
| FR-10 | `POST /api/organizer/events` | `201 { event: OrganizerEvent }` |
| — | `GET /api/organizer/events?status=&page=&limit=` | `{ events: OrganizerEvent[], pagination }` |
| — | `GET /api/organizer/events/:id` | `{ event: OrganizerEvent }` |
| FR-11, FR-13, FR-16 | `PATCH /api/organizer/events/:id` | `{ event: OrganizerEvent }` |
| FR-12 | `DELETE /api/organizer/events/:id` | `{ deleted: true }` |
| FR-14 | `GET /api/organizer/events/:id/attendees?status=&page=&limit=` | `{ attendees: Attendee[], pagination, summary: { confirmed, checkedIn } }` |
| FR-14 | `POST /api/organizer/events/:id/check-in` body `{ code }` | `{ attendee: Attendee, alreadyCheckedIn: boolean }` |
| FR-14 | `POST /api/organizer/events/:id/attendees/:registrationId/check-in` | `{ attendee: Attendee, alreadyCheckedIn: boolean }` |
| Ratings | `GET /api/organizer/events/:id/feedback?page=&limit=` | `{ summary: { count, average, distribution }, feedback: Feedback[], pagination }` |
| — | `GET /api/organizer/venues` | `{ venues: Venue[] }` |
| — | `GET /api/organizer/categories` | `{ categories: Category[] }` |

FR-15 (notify the organizer when an event fills up) has no endpoint of its own - it fires
automatically as a `CAPACITY_FULL` notification the moment an attendee's booking takes the last
seat. The organizer reads it through `GET /api/notifications` (see `../notifications/API.md`).

### `POST /events` body

```ts
{
  title: string;          // required, 1..200 chars
  description: string;    // required, 1..5000 chars
  startsAt: string;       // required, ISO date, must be in the future
  endsAt: string;         // required, ISO date, must be after startsAt
  capacity: number;       // required, positive integer (FR-13, see below)
  categoryId: string;     // required, must reference an existing category
  venueId?: string;       // optional - omit for "no venue yet"
  imageUrl?: string;      // optional, http(s) only (FR-16)
  attachments?: string[]; // optional, up to 10 http(s) URLs (FR-16)
}
```

The event is always created with `status: "PENDING"` and `organizerId` set to the session user -
neither can be sent by the client; if sent, they are silently ignored.

### One request at a time until the first approval

Organizers can register themselves (see `attendee/API.md`), so a new one is limited: an
Organizer with **no approved event yet** may have only **one** `PENDING` event. A second
`POST /events` in that state is refused with `409 PENDING_LIMIT_REACHED`.

- The first approval lifts the limit for good - after it, any number of requests may wait.
- A request that was rejected or deleted does not count, so the Organizer can try again.
- The frontend can tell in advance from the totals it already loads: zero `APPROVED` and at
  least one `PENDING`.

### `PATCH /events/:id` body

Every field above, all **optional** - send only what changes. `startsAt` and `endsAt` must be
sent together (there is no way to move just one and leave the pair inconsistent).
Send `venueId: null` to clear a venue. Only works while the event is `PENDING` or `APPROVED`
and has not started yet; editing does **not** reset an `APPROVED` event back to `PENDING`.

### FR-13: capacity rules (enforced on both create and edit)

- `capacity` must be a positive integer.
- If the event has a venue, `capacity` cannot exceed that venue's `capacity`.
- `capacity` cannot be set below the number of currently CONFIRMED bookings.

### FR-16: images and attachments

`imageUrl` and every entry in `attachments` must be a syntactically valid `http://` or
`https://` URL (checked with the `URL` constructor; nothing else is accepted - no
`javascript:`, `data:`, relative paths, etc.). **Actual file upload is out of scope for this
task** - the frontend must host images/files itself (e.g. object storage) and pass the
resulting URL here.

### FR-14: check-in at the door

Two ways to mark an attendee as arrived; both set the booking's `checkedInAt`:

- **Scan:** `POST /events/:id/check-in` with `{ code }`, the text read from the ticket's QR
  (the booking token, base64url, 16..64 characters).
- **From the list:** `POST /events/:id/attendees/:registrationId/check-in`, for someone whose
  phone is flat or who cannot show the QR - the organizer finds the name and checks it.

Rules:

- Open while the event is `APPROVED` and has not ended. Allowed before the start on purpose
  (doors open early). Otherwise `409 CHECK_IN_CLOSED`.
- A second check-in of the same booking is **not** an error: `200` with
  `alreadyCheckedIn: true` and the original `checkedInAt`, so the door sees "already in at
  18:02". Two scanners reading one ticket at once only record it once.
- A cancelled booking is refused (`409 TICKET_CANCELLED`); a scanned ticket for a different
  event is `409 TICKET_FOR_OTHER_EVENT`.
- `summary` on the attendee list gives the door's running count: confirmed seats and how many
  of them are checked in.

### Ratings of an event

`GET /events/:id/feedback` lists what attendees said after the event, newest first:

```ts
type Feedback = { id: string; rating: number; comment: string | null; createdAt: string;
                  user: { fullName: string } };
// summary.average: one decimal (4.3), null when nobody has rated yet.
// summary.distribution: { 1: n, 2: n, 3: n, 4: n, 5: n } - how many gave each number of stars.
```

`limit` is 1..50 (default 20). Someone else's event is `404 EVENT_NOT_FOUND`.

### FR-12: delete

Only before the event starts, and only when it has zero CONFIRMED bookings. A CANCELLED
booking does not block deletion.

## Error codes (add these to `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `INVALID_TITLE` | 422 | missing/blank/too-long title |
| `INVALID_DESCRIPTION` | 422 | missing/blank/too-long description |
| `INVALID_DATES` | 422 | bad format, `startsAt` in the past, `startsAt` not before `endsAt`, or `startsAt`/`endsAt` sent without its pair on edit |
| `INVALID_CAPACITY` | 422 | not a positive integer |
| `INVALID_CATEGORY` | 422 | malformed id, or no such category |
| `INVALID_VENUE` | 422 | malformed id, or no such venue |
| `INVALID_IMAGE_URL` | 422 | `imageUrl` is not an http(s) URL |
| `INVALID_ATTACHMENTS` | 422 | more than 10 entries, or one is not an http(s) URL |
| `CAPACITY_EXCEEDS_VENUE` | 422 | FR-13: capacity above the chosen venue's capacity |
| `CAPACITY_BELOW_BOOKED` | 422 | FR-13: capacity below the current confirmed bookings |
| `INVALID_FILTER` | 422 | bad `status` on a list endpoint |
| `INVALID_PAGINATION` | 422 | bad `page` or `limit` |
| `EVENT_NOT_FOUND` | 404 | unknown, malformed, or not this organizer's event |
| `EVENT_NOT_EDITABLE` | 409 | the event is REJECTED or CANCELLED |
| `EVENT_ALREADY_STARTED` | 409 | editing or deleting after the start time |
| `EVENT_HAS_BOOKINGS` | 409 | deleting an event with confirmed bookings |
| `PENDING_LIMIT_REACHED` | 409 | creating a second request before the first has been approved |
| `INVALID_CODE` | 422 | check-in `code` missing or not shaped like a ticket token |
| `TICKET_NOT_FOUND` | 404 | no booking has this code, or (from the list) the booking is not this event's |
| `TICKET_FOR_OTHER_EVENT` | 409 | the scanned ticket belongs to a different event |
| `TICKET_CANCELLED` | 409 | the booking was cancelled |
| `CHECK_IN_CLOSED` | 409 | the event is not APPROVED, or has already ended |

The existing `UNAUTHENTICATED` (401) and `FORBIDDEN` (403, for Attendees and Admins) also apply.
