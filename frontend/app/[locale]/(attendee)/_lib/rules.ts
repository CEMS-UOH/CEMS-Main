// Pure decision logic for the attendee screens - no React, no fetch - so it is unit tested
// (rules.test.mjs) and every screen agrees on the same answers. OWNER: Role 4.
// Only type imports here: they are erased, so the tests can load this file on its own.
import type { AttendeeEvent, Booking, Category, Venue } from './attendee-api';

export type Role = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export type Session =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'user'; role: Role };

/**
 * What the booking panel on an event page shows, in priority order:
 * ended > booked > started > full > loading > guest > not-attendee > can-book.
 * The API enforces every one of these rules again; this only picks the right message/button.
 */
export type BookingAction =
  | 'ended'
  | 'booked'
  | 'started'
  | 'full'
  | 'loading'
  | 'guest'
  | 'not-attendee'
  | 'can-book';

const time = (iso: string) => new Date(iso).getTime();

export function bookingAction(
  event: Pick<AttendeeEvent, 'startsAt' | 'endsAt' | 'isFull'>,
  booking: Pick<Booking, 'status'> | null,
  session: Session,
  now: Date
): BookingAction {
  const nowMs = now.getTime();
  if (time(event.endsAt) <= nowMs) return 'ended';
  if (booking?.status === 'CONFIRMED') return 'booked';
  if (time(event.startsAt) <= nowMs) return 'started';
  if (event.isFull) return 'full';
  if (session.status === 'loading') return 'loading';
  if (session.status === 'guest') return 'guest';
  if (session.role !== 'ATTENDEE') return 'not-attendee';
  return 'can-book';
}

/** The attendee's live booking for one event (the API keeps one row per attendee and event). */
export function findBookingForEvent(bookings: Booking[], eventId: string): Booking | null {
  return bookings.find((b) => b.event.id === eventId && b.status === 'CONFIRMED') ?? null;
}

export type BookingTab = 'upcoming' | 'past' | 'cancelled';

/**
 * FR-08 history, split for the "My bookings" tabs:
 * - cancelled: the attendee cancelled, or the organizer cancelled the event
 * - past: a confirmed seat for an event that has ended
 * - upcoming: everything else (confirmed, not ended yet), soonest first
 */
export function bookingTab(booking: Booking, now: Date): BookingTab {
  if (booking.status === 'CANCELLED' || booking.event.status === 'CANCELLED') return 'cancelled';
  if (time(booking.event.endsAt) <= now.getTime()) return 'past';
  return 'upcoming';
}

export function groupBookings(bookings: Booking[], now: Date): Record<BookingTab, Booking[]> {
  const groups: Record<BookingTab, Booking[]> = { upcoming: [], past: [], cancelled: [] };
  for (const booking of bookings) groups[bookingTab(booking, now)].push(booking);
  // The API sends newest event first; the next event is what matters most in "upcoming".
  groups.upcoming.sort((a, b) => time(a.event.startsAt) - time(b.event.startsAt));
  return groups;
}

/** Feedback opens once the event is over, for attendees who held a seat. */
export function canGiveFeedback(booking: Booking, now: Date): boolean {
  return (
    booking.status === 'CONFIRMED' &&
    booking.event.status === 'APPROVED' &&
    time(booking.event.endsAt) <= now.getTime()
  );
}

export type SeatsTone = 'full' | 'low' | 'ok';

/** "low" when 10% or fewer of the seats (and at most 10) are left. */
export function seatsTone(event: Pick<AttendeeEvent, 'seatsLeft' | 'capacity' | 'isFull'>): SeatsTone {
  if (event.isFull || event.seatsLeft <= 0) return 'full';
  if (event.seatsLeft <= Math.min(10, Math.ceil(event.capacity * 0.1))) return 'low';
  return 'ok';
}

/**
 * Options for the category and venue filters. The attendee API has no categories/venues
 * endpoint (the organizer one needs the ORGANIZER role), so they come from the upcoming events
 * themselves - which also means a filter never offers a choice with zero events.
 */
export function filterOptions(
  events: Pick<AttendeeEvent, 'category' | 'venue'>[],
  locale: string
): { categories: Category[]; venues: Venue[] } {
  const categories = new Map<string, Category>();
  const venues = new Map<string, Venue>();
  for (const event of events) {
    categories.set(event.category.id, event.category);
    if (event.venue) venues.set(event.venue.id, event.venue);
  }
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, locale);
  return {
    categories: [...categories.values()].sort(byName),
    venues: [...venues.values()].sort(byName),
  };
}

/**
 * Folds text for search: case, Arabic diacritics and tatweel, and the common spelling
 * variants (أ/إ/آ -> ا, ى -> ي, ة -> ه), so "ورشة" finds "ورشه" and "AI" finds "ai".
 */
export function foldForSearch(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟـ]/g, '') // harakat, superscript alef, tatweel
    .replace(/[آأإٱ]/g, 'ا') // alef variants
    .replace(/ى/g, 'ي') // alef maqsura -> yaa
    .replace(/ة/g, 'ه') // taa marbuta -> haa
    .replace(/[̀-ͯ]/g, '') // Latin accents left over from NFKD
    .replace(/\s+/g, ' ')
    .trim();
}

/** Client-side text search over the events already loaded (the API has no text search). */
export function searchEvents<
  T extends Pick<AttendeeEvent, 'title' | 'description' | 'category' | 'venue' | 'organizer'>,
>(events: T[], query: string): T[] {
  const words = foldForSearch(query).split(' ').filter(Boolean);
  if (words.length === 0) return events;
  return events.filter((event) => {
    const haystack = foldForSearch(
      [
        event.title,
        event.description,
        event.category.name,
        event.venue?.name ?? '',
        event.venue?.building ?? '',
        event.organizer.fullName,
      ].join(' ')
    );
    return words.every((word) => haystack.includes(word));
  });
}

export type FeedFilters = { category: string; venue: string; date: string; page: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads the feed filters from the URL. Anything malformed is dropped rather than sent, so a
 * hand-edited link shows the unfiltered feed instead of an INVALID_FILTER error.
 */
export function parseFeedFilters(params: { get(name: string): string | null }): FeedFilters {
  const category = params.get('category') ?? '';
  const venue = params.get('venue') ?? '';
  const date = params.get('date') ?? '';
  const page = Number(params.get('page') ?? '1');
  return {
    category: UUID_RE.test(category) ? category : '',
    venue: UUID_RE.test(venue) ? venue : '',
    date: DAY_RE.test(date) ? date : '',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}

/** The URL query string for the feed (page 1 and empty filters are left out). */
export function feedQueryString(filters: FeedFilters): string {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.venue) params.set('venue', filters.venue);
  if (filters.date) params.set('date', filters.date);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const hasActiveFilters = (filters: FeedFilters) =>
  Boolean(filters.category || filters.venue || filters.date);
