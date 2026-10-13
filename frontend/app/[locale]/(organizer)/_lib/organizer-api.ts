// Every organizer call, through the shared apiFetch (never a bare fetch - CLAUDE.md rule 9).
// Contract: backend/src/modules/organizer/API.md.
import { apiFetch } from '@/lib/api';
import { toQuery } from '../../_dashboard/lib/query';
import type {
  Attendee,
  BookingStatus,
  Category,
  EventInput,
  EventStatus,
  OrganizerEvent,
  Pagination,
  Venue,
} from '../../_dashboard/lib/types';

const BASE = '/api/organizer';

/** GET /api/organizer/events */
export const listMyEvents = (params: { status?: EventStatus | ''; page?: number; limit?: number }) =>
  apiFetch<{ events: OrganizerEvent[]; pagination: Pagination }>(
    `${BASE}/events${toQuery(params)}`
  );

/** GET /api/organizer/events/:id */
export const getMyEvent = (id: string) =>
  apiFetch<{ event: OrganizerEvent }>(`${BASE}/events/${encodeURIComponent(id)}`);

/** POST /api/organizer/events (FR-10) */
export const createEvent = (input: EventInput) =>
  apiFetch<{ event: OrganizerEvent }>(`${BASE}/events`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

/** PATCH /api/organizer/events/:id (FR-11) */
export const updateEvent = (id: string, input: EventInput) =>
  apiFetch<{ event: OrganizerEvent }>(`${BASE}/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

/** DELETE /api/organizer/events/:id (FR-12) */
export const deleteEvent = (id: string) =>
  apiFetch<{ deleted: boolean }>(`${BASE}/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

/** GET /api/organizer/events/:id/attendees (FR-14) */
export const listAttendees = (
  id: string,
  params: { status?: BookingStatus | ''; page?: number; limit?: number }
) =>
  apiFetch<{ attendees: Attendee[]; pagination: Pagination }>(
    `${BASE}/events/${encodeURIComponent(id)}/attendees${toQuery(params)}`
  );

/** GET /api/organizer/venues */
export const listVenues = () => apiFetch<{ venues: Venue[] }>(`${BASE}/venues`);

/** GET /api/organizer/categories */
export const listCategories = () => apiFetch<{ categories: Category[] }>(`${BASE}/categories`);
