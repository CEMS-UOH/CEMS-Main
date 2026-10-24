# Notifications API: the signed-in user's inbox

Covers reading the notifications that other features create:

| Type | Created by | Who receives it | FR |
|---|---|---|---|
| `BOOKING_CONFIRMATION` | booking a seat | the Attendee | FR-06 |
| `CAPACITY_FULL` | the booking that fills the last seat | the event's Organizer | FR-15 |
| `EVENT_APPROVED` / `EVENT_REJECTED` | an Admin deciding on a PENDING event | the event's Organizer | FR-17 |
| `BROADCAST` | an Admin's announcement | every active user | FR-21 |
| `SYSTEM` | reserved, nothing creates it yet | - | - |

Every response uses the standard envelope (`backend/src/lib/response.js`). Requires a session
cookie; **every role** has an inbox. A request only ever reads or changes the caller's own rows.

## Shape

```ts
type Notification = {
  id: string;
  type: 'BOOKING_CONFIRMATION' | 'CAPACITY_FULL' | 'EVENT_APPROVED' | 'EVENT_REJECTED'
      | 'BROADCAST' | 'SYSTEM';
  title: string;   // the event title, or the admin's own title for BROADCAST
  body: string;    // English fallback text, or the admin's own text for BROADCAST
  isRead: boolean;
  createdAt: string; // ISO date
};
```

**Show it by `type` in the reader's language** (Arabic or English), using `title` as the event
name. `body` is only meant to be shown as-is for `BROADCAST` and `SYSTEM`, whose text an admin
wrote.

## Endpoints

| Method and path | Success `data` |
|---|---|
| `GET /api/notifications?unread=&page=&limit=` | `{ notifications: Notification[], unreadCount, pagination: { page, limit, total, totalPages } }` |
| `POST /api/notifications/:id/read` | `{ notification: Notification }` |
| `POST /api/notifications/read-all` | `{ updated: number }` |

- Newest first. `unread=true` lists only unread ones; `unreadCount` is always the total number
  of unread notifications (whatever the filter), for the bell badge.
- `page` is 1 or more (default 1), `limit` is 1..50 (default 20).
- Marking an already-read notification read again is not an error.

## Error codes (in `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `INVALID_FILTER` | 422 | `unread` is not `true` or `false` |
| `INVALID_PAGINATION` | 422 | bad `page` or `limit` |
| `NOTIFICATION_NOT_FOUND` | 404 | malformed id, unknown id, or someone else's notification |

The existing `UNAUTHENTICATED` (401) also applies.
