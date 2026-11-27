# Attendee screens (Role 4)

Next.js route group for everything an Attendee does. The group name `(attendee)` does not appear
in URLs; `_lib` and `_ui` are private folders (not routes).

| URL | Screen | FR | API (backend/src/modules/attendee/API.md) |
|---|---|---|---|
| `/events` | Upcoming events with search and filters | FR-03, FR-04 | `GET /api/attendee/events` |
| `/events/:id` | Event details, book a seat, QR ticket, cancel, rate after it ends | FR-09, FR-05, FR-06, FR-07 | `GET /events/:id`, `GET /bookings`, `POST /bookings`, `POST /bookings/:id/cancel` |
| `/bookings` | My bookings: upcoming / past / cancelled, ticket, cancel, rate | FR-08, FR-07 | `GET /bookings`, `POST /bookings/:id/cancel` |

Browsing is public; booking needs an Attendee session (the API enforces it - the screens only
pick the right button or message).

## Folders

- `_lib/attendee-api.ts` - typed calls through the shared `apiFetch` (never a bare fetch).
- `_lib/rules.ts` - pure decisions (which booking button, tab grouping, search, filter parsing).
- `_lib/qr.ts` - QR encoder for the ticket. Drawn in the browser so the booking token is never
  sent to a third-party QR service, and no new npm dependency.
- `_lib/session.tsx` - one `GET /auth/me` for the whole area.
- `_ui/` - components only used here.

## Tests

```bash
cd frontend
npm run test:attendee   # Node 22.6+ (uses node:test with --experimental-strip-types)
```

`rules.test.mjs` covers the screen rules; `qr.test.mjs` pins the QR output to reference symbols
from Project Nayuki's QR Code generator.

## Not in the API yet

**Text search and filter lists.** The API has no `q` parameter, so search runs over the loaded
page (48 events). The category/venue choices come from the upcoming events, because the
categories/venues endpoints need the Organizer role. A public `GET /api/attendee/categories`
and `/venues` plus `?q=` would let both move server-side.
