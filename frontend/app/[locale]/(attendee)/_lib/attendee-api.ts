// Typed calls for the attendee screens (FR-03..FR-09 + feedback). OWNER: Role 4.
// The JSON contract is backend/src/modules/attendee/API.md (Role 2). Every call goes through the
// shared apiFetch (CLAUDE.md rule 9), which sends the session cookie and unwraps ok()/fail().
import { apiFetch } from '@/lib/api';

export type Venue = { id: string; name: string; building: string | null; location: string | null };
export type Category = { id: string; name: string };

export type AttendeeEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: 'APPROVED';
  imageUrl: string | null;
  category: Category;
  venue: Venue | null;
  organizer: { id: string; fullName: string };
  seatsTaken: number;
  seatsLeft: number;
  isFull: boolean;
};

export type EventDetails = AttendeeEvent & { attachments: string[] };

export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type EventStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type Booking = {
  id: string;
  status: BookingStatus;
  qrCode: string | null;
  checkedInAt: string | null;
  createdAt: string;
  canCancel: boolean;
  /** The attendee's own rating of this event (1..5), null if not rated. Only on GET /bookings. */
  myRating?: number | null;
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: EventStatus;
    imageUrl: string | null;
    category: Category;
    venue: Venue | null;
  };
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export type EventFilters = {
  category?: string;
  venue?: string;
  /** YYYY-MM-DD, a campus day (Asia/Riyadh). */
  date?: string;
  page?: number;
  limit?: number;
};

/** Builds the query string for GET /events, skipping empty values. */
export function eventsQuery(filters: EventFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.venue) params.set('venue', filters.venue);
  if (filters.date) params.set('date', filters.date);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const query = params.toString();
  return query ? `?${query}` : '';
}

// --- FR-03, FR-04: browse and filter (public) ---
export const listEvents = (filters: EventFilters = {}) =>
  apiFetch<{ events: AttendeeEvent[]; pagination: Pagination }>(
    `/api/attendee/events${eventsQuery(filters)}`
  );

// --- Recommended for you (Attendee) - backend/src/modules/attendee/recommendations.service.js ---
/** Why an event was suggested: the attendee's favourite category, an organizer they liked, or popular. */
export type RecommendationReason = 'CATEGORY' | 'ORGANIZER' | 'POPULAR';
export type Recommendations = {
  /** 'history' = from the attendee's bookings and ratings; 'popular' = not enough history yet. */
  basis: 'history' | 'popular';
  events: (AttendeeEvent & { reason: RecommendationReason })[];
};
export const getRecommendations = () => apiFetch<Recommendations>('/api/attendee/recommendations');

// --- FR-09: one event (public) ---
export const getEvent = (id: string) =>
  apiFetch<{ event: EventDetails }>(`/api/attendee/events/${encodeURIComponent(id)}`);

// --- FR-05 (+ FR-06 notification, created by the API): book a seat ---
export const bookEvent = (eventId: string) =>
  apiFetch<{ booking: Booking }>('/api/attendee/bookings', {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  });

// --- FR-08: full booking history, newest event first ---
export const listBookings = (status?: BookingStatus) =>
  apiFetch<{ bookings: Booking[] }>(`/api/attendee/bookings${status ? `?status=${status}` : ''}`);

// --- FR-07: cancel before the event starts ---
export const cancelBooking = (bookingId: string) =>
  apiFetch<{ booking: Booking }>(
    `/api/attendee/bookings/${encodeURIComponent(bookingId)}/cancel`,
    { method: 'POST' }
  );

// --- Feedback (rating 1..5 + optional comment) ---
// POST /api/attendee/events/:id/feedback - see backend/src/modules/attendee/API.md.
// Open after the event ends, to an attendee who held a confirmed seat; once per event.
export type Feedback = { id: string; rating: number; comment: string | null; createdAt: string };

export const FEEDBACK_COMMENT_MAX = 1000;

export const submitFeedback = (eventId: string, input: { rating: number; comment?: string }) =>
  apiFetch<{ feedback: Feedback }>(
    `/api/attendee/events/${encodeURIComponent(eventId)}/feedback`,
    { method: 'POST', body: JSON.stringify(input) }
  );

// --- Waitlist for full events - backend/src/modules/attendee/API.md ---
export type WaitlistPlace = { eventId: string; joinedAt: string; position: number };
export const joinWaitlist = (eventId: string) =>
  apiFetch<{ waitlist: WaitlistPlace }>(`/api/attendee/events/${encodeURIComponent(eventId)}/waitlist`, {
    method: 'POST',
  });
export const leaveWaitlist = (eventId: string) =>
  apiFetch<{ left: boolean }>(`/api/attendee/events/${encodeURIComponent(eventId)}/waitlist`, {
    method: 'DELETE',
  });
export const listMyWaitlist = () =>
  apiFetch<{ waitlist: (WaitlistPlace & { event: AttendeeEvent })[] }>('/api/attendee/waitlist');

// --- Saved events ---
export const listSaved = () =>
  apiFetch<{ events: (AttendeeEvent & { savedAt: string })[] }>('/api/attendee/favorites');
export const saveEvent = (eventId: string) =>
  apiFetch<{ saved: boolean }>(`/api/attendee/favorites/${encodeURIComponent(eventId)}`, { method: 'PUT' });
export const unsaveEvent = (eventId: string) =>
  apiFetch<{ saved: boolean }>(`/api/attendee/favorites/${encodeURIComponent(eventId)}`, { method: 'DELETE' });

// --- Attendance certificate (public) - backend/src/modules/certificates/API.md ---
export type Certificate = {
  id: string;
  attendeeName: string;
  eventTitle: string;
  category: string;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  issuedBy: string;
  attendedAt: string;
};
export const getCertificate = (id: string) =>
  apiFetch<{ certificate: Certificate }>(`/api/certificates/${encodeURIComponent(id)}`);
