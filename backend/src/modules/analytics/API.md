# Analytics API (FR-20)

Admin-only numbers about how the system is used. Mounted inside the admin module, so every
route needs a session cookie and the `ADMIN` role. Standard envelope
(`backend/src/lib/response.js`).

| Method and path | Success `data` |
|---|---|
| `GET /api/admin/analytics` | `Overview` (below) |
| `GET /api/admin/analytics/predictions` | `{ method, trainedOn, showUpRate, predictions: Prediction[] }` |

## `GET /api/admin/analytics` - computed here, from the database

```ts
type Overview = {
  totals: {
    events:     { total, pending, approved, rejected, cancelled };
    users:      { total, attendees, organizers, admins };
    bookings:   { confirmed, cancelled };
    // Only events that are over: confirmed seats, how many were checked in, and the share.
    attendance: { confirmed, checkedIn, rate: number | null };   // rate 0..1
    ratings:    { count, average: number | null };              // average 1..5, one decimal
  };
  // Every category, busiest first. Approved events only.
  byCategory: { id, name, events, bookings, checkIns, averageRating: number | null, ratings }[];
  // Eight months: five back, this month, two ahead (campus time). Approved events by start.
  byMonth: { month: 'YYYY-MM', events, bookings, checkIns }[];
  // The five approved events with the most confirmed bookings.
  topEvents: { id, title, startsAt, endsAt, capacity, bookings, checkIns,
               fillRate: number | null, averageRating: number | null }[];
  generatedAt: string;
};
```

Always available - it does not need the Python service.

## `GET /api/admin/analytics/predictions` - from the Python service

Expected bookings and attendance for the next approved events (up to 50), from the model in
`analytics/app/model.py`. The backend sends the service only numbers (category, capacity,
weekday, hour, length, how early the event was announced, bookings, check-ins) - never names,
emails or titles - and puts the titles back on the answer.

```ts
type Prediction = {
  eventId: string; title: string; startsAt: string; capacity: number;
  bookingsSoFar: number;       // confirmed right now
  expectedBookings: number;    // never below bookingsSoFar, never above capacity
  expectedAttendance: number;  // expectedBookings x showUpRate
};
// method: 'model' (random forest, from 12 past events up), 'baseline' (category or overall
//         average fill rate - too little history for a model yet), or 'none' (nothing upcoming).
// trainedOn: how many past events it learned from. showUpRate: 0..1, share of confirmed
//         seats checked in at past events that used check-in (0.8 until there is one).
```

Needs `ANALYTICS_URL` in `.env` (see `.env.example`).

## Error codes (in `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `ANALYTICS_UNAVAILABLE` | 503 | `ANALYTICS_URL` is not set, or the Python service is down, slow (10 s) or answered badly |

The existing `UNAUTHENTICATED` (401) and `FORBIDDEN` (403) also apply.
