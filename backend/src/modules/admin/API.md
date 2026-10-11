# Admin API: events, users, categories, broadcast (FR-17..FR-19, FR-21, FR-22)

The JSON contract between the backend (Role 3, by Leader override - see CLAUDE.md) and the
admin frontend (Role 5). Every response uses the standard envelope from
`backend/src/lib/response.js`: `{ success: true, data }` or
`{ success: false, error: { message, code } }`. Show errors by `code`, translated through the
`Errors` namespace (CLAUDE.md rule 9).

Every route requires a session cookie and the `ADMIN` role (`requireAuth` +
`requireRole('ADMIN')`). All dates are ISO-8601 strings in UTC. All ids are UUIDs.

**FR-20 (analytics) is out of scope for this module** - Role 6 builds those endpoints.

## Not in the original FR list - added for usability

`GET /events` was not an explicit FR bullet, but FR-17 (approve/reject) cannot be used at all
if the admin has no way to find out which events are `PENDING`. Flagged here and in the PR
description.

## Shapes

```ts
type PublicUser = {
  id: string; email: string; fullName: string;
  role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN'; isActive: boolean; createdAt: string;
  // never passwordHash
};

type Venue = { id: string; name: string; building: string | null; location: string | null; capacity: number };
type Category = { id: string; name: string; description: string | null; eventCount?: number };

type AdminEvent = {
  id: string; title: string; description: string;
  startsAt: string; endsAt: string; capacity: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  imageUrl: string | null; attachments: string[]; createdAt: string;
  organizer: { id: string; fullName: string; email: string };
  category: Category; venue: Venue | null;
  confirmedBookings: number;
};
```

## Events - FR-17, FR-22

| FR | Method and path | Success `data` |
|---|---|---|
| — | `GET /api/admin/events?status=&organizerId=&page=&limit=` | `{ events: AdminEvent[], pagination }` |
| FR-17 | `POST /api/admin/events/:id/approve` | `{ event: AdminEvent }` |
| FR-17 | `POST /api/admin/events/:id/reject` | `{ event: AdminEvent }` |
| FR-22 | `DELETE /api/admin/events/:id` | `{ deleted: true }` |

Approve/reject only work on a `PENDING` event (409 `EVENT_NOT_PENDING` otherwise - approving
twice, or rejecting an already-approved event, are both refused). `DELETE` works on **any**
event regardless of status or existing bookings - unlike the organizer's own FR-12 delete, this
is an unconditional admin override; confirmed bookings and feedback are cascade-deleted with it.

## Users - FR-18, FR-22

| FR | Method and path | Success `data` |
|---|---|---|
| FR-18 | `GET /api/admin/users?role=&q=&page=&limit=` | `{ users: PublicUser[], pagination }` |
| FR-18 | `POST /api/admin/users` body `{ email, password, fullName, role }` | `201 { user: PublicUser }` |
| FR-18 | `POST /api/admin/users/:id/activate` | `{ user: PublicUser }` |
| FR-18 | `POST /api/admin/users/:id/deactivate` | `{ user: PublicUser }` |
| FR-18 | `POST /api/admin/users/:id/role` body `{ role }` | `{ user: PublicUser }` |
| FR-22 | `DELETE /api/admin/users/:id` | `{ deleted: true }` |

`q` searches `email` and `fullName`, case-insensitive, substring match.

`POST /users` only accepts `role: "ORGANIZER"` or `"ADMIN"` (422 `INVALID_ROLE` otherwise) -
Attendees self-register through FR-01. The password is hashed with bcrypt exactly like
registration (same `BCRYPT_ROUNDS`).

### Self-protection (FR-18)

Two independent rules, both enforced on **deactivate**, **role change away from ADMIN**, and
**delete**:

1. **You can never target your own account** for any of those three actions - `409
   CANNOT_MODIFY_SELF`, even if you are not the last admin.
2. **The last currently-active ADMIN is always protected** from any of those three actions,
   regardless of who performs them - `409 LAST_ADMIN_PROTECTED`. An inactive admin does not
   count, so demoting/deleting an already-deactivated admin is not blocked by this rule.

Neither rule applies to **activating** a user or **promoting** someone to `ADMIN` - those are
always safe and need no protection.

## Categories - FR-19

| Method and path | Success `data` |
|---|---|
| `GET /api/admin/categories` | `{ categories: Category[] }` (each with `eventCount`) |
| `POST /api/admin/categories` body `{ name, description? }` | `201 { category: Category }` |
| `PATCH /api/admin/categories/:id` body `{ name?, description? }` | `{ category: Category }` |
| `DELETE /api/admin/categories/:id` | `{ deleted: true }` |

Deleting is blocked with `409 CATEGORY_HAS_EVENTS` while any event still references the
category - `categoryId` is a required field on `Event`, so this can never be enforced after
the fact by the database alone.

## Broadcast - FR-21

| Method and path | Success `data` |
|---|---|
| `POST /api/admin/broadcast` body `{ title, body }` | `201 { notified: number }` |

Creates one `BROADCAST` `Notification` row per currently active user (`isActive: true`),
including the sending admin. `notified` is how many rows were created (0 if there happen to be
no active users - not an error).

## Error codes (add these to `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `INVALID_FILTER` | 422 | bad `status`/`role`/`organizerId` on a list endpoint |
| `INVALID_PAGINATION` | 422 | bad `page` or `limit` |
| `EVENT_NOT_FOUND` | 404 | unknown or malformed event id |
| `EVENT_NOT_PENDING` | 409 | approve/reject on a non-PENDING event |
| `USER_NOT_FOUND` | 404 | unknown or malformed user id |
| `INVALID_EMAIL` | 422 | bad email format (user creation) |
| `WEAK_PASSWORD` | 422 | password under 8 characters, or over 200 |
| `INVALID_NAME` | 422 | missing/blank/too-long `fullName` (users) or `name` (categories) |
| `INVALID_ROLE` | 422 | creating a user with role ATTENDEE, or an unrecognised role value |
| `EMAIL_TAKEN` | 409 | creating a user with an email already in use |
| `CANNOT_MODIFY_SELF` | 409 | deactivate/demote/delete targeting your own account |
| `LAST_ADMIN_PROTECTED` | 409 | deactivate/demote/delete targeting the last active admin |
| `USER_HAS_DATA` | 409 | deleting a user who organizes events or has registrations/feedback |
| `CATEGORY_NOT_FOUND` | 404 | unknown or malformed category id |
| `CATEGORY_NAME_TAKEN` | 409 | category name already in use |
| `CATEGORY_HAS_EVENTS` | 409 | deleting a category that events still reference |
| `INVALID_DESCRIPTION` | 422 | bad `description` (category) |
| `INVALID_TITLE` | 422 | missing/blank/too-long broadcast `title` |
| `INVALID_BODY` | 422 | missing/blank/too-long broadcast `body` |

The existing `UNAUTHENTICATED` (401) and `FORBIDDEN` (403, for Attendees and Organizers) also
apply.
