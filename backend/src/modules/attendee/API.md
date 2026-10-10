# Attendee API: events and bookings (FR-03..FR-09)

The JSON contract between the backend (Role 2) and the attendee frontend (Role 4).
Every response uses the standard envelope from `backend/src/lib/response.js`:
`{ success: true, data }` or `{ success: false, error: { message, code } }`.
Show errors by `code`, translated through the `Errors` namespace (CLAUDE.md rule 9).

All dates are ISO-8601 strings in UTC. All ids are UUIDs.

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

The existing `UNAUTHENTICATED` (401) and `FORBIDDEN` (403, for Organizers and Admins on
`/bookings`) also apply.
