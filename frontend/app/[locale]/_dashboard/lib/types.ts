// JSON shapes returned by the organizer and admin APIs.
// Mirrors backend/src/modules/organizer/API.md and backend/src/modules/admin/API.md -
// change these only when those contracts change.

export type EventStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export const EVENT_STATUSES: EventStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
export const BOOKING_STATUSES: BookingStatus[] = ['CONFIRMED', 'CANCELLED'];
export const USER_ROLES: UserRole[] = ['ATTENDEE', 'ORGANIZER', 'ADMIN'];

export type Pagination = { page: number; limit: number; total: number; totalPages: number };

export type Venue = {
  id: string;
  name: string;
  building: string | null;
  location: string | null;
  capacity: number;
};

export type Category = { id: string; name: string; description: string | null };

/** GET /api/admin/categories adds how many events use each one. */
export type AdminCategory = Category & { eventCount: number };

type EventBase = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: EventStatus;
  imageUrl: string | null;
  attachments: string[];
  createdAt: string;
  category: Category;
  venue: Venue | null;
};

export type OrganizerEvent = EventBase & {
  updatedAt: string;
  seatsTaken: number;
  seatsLeft: number;
  isFull: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type AdminEvent = EventBase & {
  organizer: { id: string; fullName: string; email: string };
  confirmedBookings: number;
};

export type Attendee = {
  id: string;
  status: BookingStatus;
  checkedInAt: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
};

/** Body of POST /api/organizer/events; PATCH accepts the same fields. */
export type EventInput = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  categoryId: string;
  venueId: string | null;
  imageUrl: string | null;
  attachments: string[];
};
