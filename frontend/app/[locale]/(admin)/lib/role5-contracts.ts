/**
 * Role 5 assumed API contracts (mock data + types).
 *
 * OWNER: Role 5 (organizer / admin / notifications UI).
 * Flip ROLE5_USE_MOCKS to false when Role 2 / 3 / 6 ship the real endpoints.
 *
 * Envelope (already used by the backend):
 *   success: { success: true,  data }
 *   failure: { success: false, error: { message, code } }
 *
 * Assumed endpoints
 * -----------------
 * Organizer (Role 3)
 *   GET    /api/organizer/events
 *   POST   /api/organizer/events
 *   GET    /api/organizer/events/:id
 *   PATCH  /api/organizer/events/:id
 *   DELETE /api/organizer/events/:id
 *   GET    /api/organizer/events/:id/attendees
 *   GET    /api/organizer/venues
 *   GET    /api/organizer/categories
 *
 * Admin (Role 2)
 *   GET    /api/admin/dashboard
 *   GET    /api/admin/users
 *   PATCH  /api/admin/users/:id            body { isActive }
 *   GET    /api/admin/events?status=PENDING
 *   PATCH  /api/admin/events/:id/review    body { status: APPROVED | REJECTED }
 *   GET    /api/admin/analytics?from&to&categoryId
 *
 * Notifications (confirm owner with Role 2 / 3)
 *   GET    /api/notifications
 *   PATCH  /api/notifications/:id/read     body { isRead: true }
 */

export const ROLE5_USE_MOCKS = true;

export const ROLE5_ENDPOINTS = {
  organizerEvents: '/api/organizer/events',
  organizerEvent: (id: string) => `/api/organizer/events/${id}`,
  organizerAttendees: (id: string) => `/api/organizer/events/${id}/attendees`,
  organizerVenues: '/api/organizer/venues',
  organizerCategories: '/api/organizer/categories',
  adminDashboard: '/api/admin/dashboard',
  adminUsers: '/api/admin/users',
  adminUser: (id: string) => `/api/admin/users/${id}`,
  adminEvents: '/api/admin/events',
  adminEventReview: (id: string) => `/api/admin/events/${id}/review`,
  adminAnalytics: '/api/admin/analytics',
  notifications: '/api/notifications',
  notificationRead: (id: string) => `/api/notifications/${id}/read`,
} as const;

export type Role5UserRole = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
export type Role5EventStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type Role5RegistrationStatus = 'CONFIRMED' | 'CANCELLED';
export type Role5NotificationType =
  | 'BOOKING_CONFIRMATION'
  | 'CAPACITY_FULL'
  | 'BROADCAST'
  | 'SYSTEM';

export type Role5Venue = {
  id: string;
  name: string;
  building: string | null;
  location: string | null;
  capacity: number;
};

export type Role5Category = {
  id: string;
  name: string;
  description: string | null;
};

export type Role5Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  status: Role5EventStatus;
  imageUrl: string | null;
  attachments: string[];
  organizerId: string;
  venueId: string | null;
  categoryId: string;
  venue: Role5Venue | null;
  category: Role5Category;
  registeredCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Role5EventInput = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  venueId: string | null;
  categoryId: string;
  imageUrl?: string | null;
};

export type Role5AttendeeRow = {
  registrationId: string;
  userId: string;
  fullName: string;
  email: string;
  status: Role5RegistrationStatus;
  qrCode: string;
  checkedInAt: string | null;
  createdAt: string;
};

export type Role5AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role5UserRole;
  isActive: boolean;
  createdAt: string;
};

export type Role5AdminDashboard = {
  usersTotal: number;
  usersActive: number;
  eventsPending: number;
  eventsApproved: number;
  notificationsUnread: number;
};

export type Role5Notification = {
  id: string;
  type: Role5NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type Role5AnalyticsFilters = {
  from?: string;
  to?: string;
  categoryId?: string;
};

export type Role5Analytics = {
  attendanceCount: number;
  registrationsVsCheckins: Array<{
    eventId: string;
    title: string;
    registered: number;
    checkedIn: number;
  }>;
  prediction: Array<{
    eventId: string;
    title: string;
    predictedAttendance: number;
    capacity: number;
  }>;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    eventCount: number;
    attendance: number;
  }>;
};

export type Role5FailCode = 'NOT_FOUND' | 'INVALID_STATUS' | 'VALIDATION';

const ORGANIZER_ID = 'org-1';

const initialVenues: Role5Venue[] = [
  { id: 'ven-1', name: 'Grand Hall', building: 'A', location: 'Main campus', capacity: 300 },
  { id: 'ven-2', name: 'Lab 4', building: 'B', location: 'Engineering', capacity: 80 },
  { id: 'ven-3', name: 'Sports Court', building: null, location: 'West field', capacity: 200 },
];

const initialCategories: Role5Category[] = [
  { id: 'cat-1', name: 'Workshop', description: null },
  { id: 'cat-2', name: 'Seminar', description: null },
  { id: 'cat-3', name: 'Competition', description: null },
  { id: 'cat-4', name: 'Cultural', description: null },
  { id: 'cat-5', name: 'Sports', description: null },
];

const initialEvents: Role5Event[] = [
  {
    id: 'evt-1',
    title: 'AI Workshop',
    description: 'Intro to campus AI tools.',
    startsAt: '2026-10-20T09:00:00.000Z',
    endsAt: '2026-10-20T12:00:00.000Z',
    capacity: 80,
    status: 'APPROVED',
    imageUrl: null,
    attachments: [],
    organizerId: ORGANIZER_ID,
    venueId: 'ven-2',
    categoryId: 'cat-1',
    venue: initialVenues[1],
    category: initialCategories[0],
    registeredCount: 2,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-10T08:00:00.000Z',
  },
  {
    id: 'evt-2',
    title: 'Career Seminar',
    description: 'Employers on campus.',
    startsAt: '2026-11-02T16:00:00.000Z',
    endsAt: '2026-11-02T18:00:00.000Z',
    capacity: 300,
    status: 'PENDING',
    imageUrl: null,
    attachments: [],
    organizerId: ORGANIZER_ID,
    venueId: 'ven-1',
    categoryId: 'cat-2',
    venue: initialVenues[0],
    category: initialCategories[1],
    registeredCount: 1,
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'evt-3',
    title: 'Football Day',
    description: 'Friendly match and booths.',
    startsAt: '2026-10-25T14:00:00.000Z',
    endsAt: '2026-10-25T18:00:00.000Z',
    capacity: 200,
    status: 'APPROVED',
    imageUrl: null,
    attachments: [],
    organizerId: ORGANIZER_ID,
    venueId: 'ven-3',
    categoryId: 'cat-5',
    venue: initialVenues[2],
    category: initialCategories[4],
    registeredCount: 1,
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-09-22T08:00:00.000Z',
  },
];

const initialAttendees: Record<string, Role5AttendeeRow[]> = {
  'evt-1': [
    {
      registrationId: 'reg-1',
      userId: 'usr-att-1',
      fullName: 'Noura Ali',
      email: 'noura@example.com',
      status: 'CONFIRMED',
      qrCode: 'QR-NORA-1',
      checkedInAt: '2026-10-20T09:10:00.000Z',
      createdAt: '2026-10-01T10:00:00.000Z',
    },
    {
      registrationId: 'reg-2',
      userId: 'usr-att-2',
      fullName: 'Fahad Salem',
      email: 'fahad@example.com',
      status: 'CONFIRMED',
      qrCode: 'QR-FAHAD-1',
      checkedInAt: null,
      createdAt: '2026-10-02T10:00:00.000Z',
    },
  ],
  'evt-2': [
    {
      registrationId: 'reg-3',
      userId: 'usr-att-3',
      fullName: 'Lama Hassan',
      email: 'lama@example.com',
      status: 'CONFIRMED',
      qrCode: 'QR-LAMA-1',
      checkedInAt: null,
      createdAt: '2026-10-03T10:00:00.000Z',
    },
  ],
  'evt-3': [
    {
      registrationId: 'reg-4',
      userId: 'usr-att-1',
      fullName: 'Noura Ali',
      email: 'noura@example.com',
      status: 'CONFIRMED',
      qrCode: 'QR-NORA-3',
      checkedInAt: '2026-10-25T14:20:00.000Z',
      createdAt: '2026-10-04T10:00:00.000Z',
    },
  ],
};

const initialUsers: Role5AdminUser[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@example.com',
    fullName: 'Campus Admin',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: ORGANIZER_ID,
    email: 'organizer@example.com',
    fullName: 'Event Organizer',
    role: 'ORGANIZER',
    isActive: true,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'usr-att-1',
    email: 'noura@example.com',
    fullName: 'Noura Ali',
    role: 'ATTENDEE',
    isActive: true,
    createdAt: '2026-03-01T00:00:00.000Z',
  },
  {
    id: 'usr-att-2',
    email: 'fahad@example.com',
    fullName: 'Fahad Salem',
    role: 'ATTENDEE',
    isActive: false,
    createdAt: '2026-03-02T00:00:00.000Z',
  },
];

const initialNotifications: Role5Notification[] = [
  {
    id: 'ntf-1',
    type: 'SYSTEM',
    title: 'Welcome',
    body: 'Your organizer workspace is ready.',
    isRead: false,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'ntf-2',
    type: 'BOOKING_CONFIRMATION',
    title: 'New registration',
    body: 'An Attendee registered for AI Workshop.',
    isRead: false,
    createdAt: '2026-10-02T08:00:00.000Z',
  },
  {
    id: 'ntf-3',
    type: 'BROADCAST',
    title: 'Campus notice',
    body: 'Hall A is closed on Friday.',
    isRead: true,
    createdAt: '2026-09-28T08:00:00.000Z',
  },
];

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

let venues = clone(initialVenues);
let categories = clone(initialCategories);
let events = clone(initialEvents);
let attendees = clone(initialAttendees);
let users = clone(initialUsers);
let notifications = clone(initialNotifications);

export function resetRole5Mocks(): void {
  venues = clone(initialVenues);
  categories = clone(initialCategories);
  events = clone(initialEvents);
  attendees = clone(initialAttendees);
  users = clone(initialUsers);
  notifications = clone(initialNotifications);
}

export function validateEventInput(input: Role5EventInput): Role5FailCode | null {
  if (!input.title.trim() || !input.description.trim() || !input.categoryId) return 'VALIDATION';
  if (!Number.isFinite(input.capacity) || input.capacity < 1) return 'VALIDATION';
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 'VALIDATION';
  return null;
}

export function applyEventReview(
  current: Role5EventStatus,
  next: Role5EventStatus,
): { ok: true; status: 'APPROVED' | 'REJECTED' } | { ok: false; code: Role5FailCode } {
  if (current !== 'PENDING') return { ok: false, code: 'INVALID_STATUS' };
  if (next !== 'APPROVED' && next !== 'REJECTED') return { ok: false, code: 'INVALID_STATUS' };
  return { ok: true, status: next };
}

function hydrateEvent(event: Role5Event): Role5Event {
  const venue = event.venueId ? (venues.find((item) => item.id === event.venueId) ?? null) : null;
  const category = categories.find((item) => item.id === event.categoryId) ?? event.category;
  const registeredCount = (attendees[event.id] ?? []).filter((row) => row.status === 'CONFIRMED').length;
  return { ...event, venue, category, registeredCount };
}

export function mockListVenues(): { venues: Role5Venue[] } {
  return { venues: clone(venues) };
}

export function mockListCategories(): { categories: Role5Category[] } {
  return { categories: clone(categories) };
}

export function mockListOrganizerEvents(): { events: Role5Event[] } {
  return { events: events.map(hydrateEvent) };
}

export function mockGetEvent(id: string): { event: Role5Event } | { code: Role5FailCode } {
  const found = events.find((item) => item.id === id);
  if (!found) return { code: 'NOT_FOUND' };
  return { event: hydrateEvent(found) };
}

export function mockCreateEvent(input: Role5EventInput): { event: Role5Event } | { code: Role5FailCode } {
  const invalid = validateEventInput(input);
  if (invalid) return { code: invalid };
  const now = new Date().toISOString();
  const created: Role5Event = {
    id: `evt-${Date.now()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    capacity: input.capacity,
    status: 'PENDING',
    imageUrl: input.imageUrl ?? null,
    attachments: [],
    organizerId: ORGANIZER_ID,
    venueId: input.venueId,
    categoryId: input.categoryId,
    venue: null,
    category: categories[0],
    registeredCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  events = [created, ...events];
  attendees[created.id] = [];
  return { event: hydrateEvent(created) };
}

export function mockUpdateEvent(
  id: string,
  input: Role5EventInput,
): { event: Role5Event } | { code: Role5FailCode } {
  const invalid = validateEventInput(input);
  if (invalid) return { code: invalid };
  const index = events.findIndex((item) => item.id === id);
  if (index < 0) return { code: 'NOT_FOUND' };
  const current = events[index];
  const updated: Role5Event = {
    ...current,
    title: input.title.trim(),
    description: input.description.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    capacity: input.capacity,
    venueId: input.venueId,
    categoryId: input.categoryId,
    imageUrl: input.imageUrl ?? current.imageUrl,
    updatedAt: new Date().toISOString(),
  };
  events[index] = updated;
  return { event: hydrateEvent(updated) };
}

export function mockDeleteEvent(id: string): { deleted: true } | { code: Role5FailCode } {
  const exists = events.some((item) => item.id === id);
  if (!exists) return { code: 'NOT_FOUND' };
  events = events.filter((item) => item.id !== id);
  delete attendees[id];
  return { deleted: true };
}

export function mockListAttendees(eventId: string): { attendees: Role5AttendeeRow[] } | { code: Role5FailCode } {
  if (!events.some((item) => item.id === eventId)) return { code: 'NOT_FOUND' };
  return { attendees: clone(attendees[eventId] ?? []) };
}

export function mockAdminDashboard(): { dashboard: Role5AdminDashboard } {
  return {
    dashboard: {
      usersTotal: users.length,
      usersActive: users.filter((item) => item.isActive).length,
      eventsPending: events.filter((item) => item.status === 'PENDING').length,
      eventsApproved: events.filter((item) => item.status === 'APPROVED').length,
      notificationsUnread: notifications.filter((item) => !item.isRead).length,
    },
  };
}

export function mockListUsers(): { users: Role5AdminUser[] } {
  return { users: clone(users) };
}

export function mockSetUserActive(
  id: string,
  isActive: boolean,
): { user: Role5AdminUser } | { code: Role5FailCode } {
  const found = users.find((item) => item.id === id);
  if (!found) return { code: 'NOT_FOUND' };
  found.isActive = isActive;
  return { user: clone(found) };
}

export function mockListReviewEvents(status: Role5EventStatus = 'PENDING'): { events: Role5Event[] } {
  return { events: events.filter((item) => item.status === status).map(hydrateEvent) };
}

export function mockReviewEvent(
  id: string,
  status: Role5EventStatus,
): { event: Role5Event } | { code: Role5FailCode } {
  const found = events.find((item) => item.id === id);
  if (!found) return { code: 'NOT_FOUND' };
  const review = applyEventReview(found.status, status);
  if (!review.ok) return { code: review.code };
  found.status = review.status;
  found.updatedAt = new Date().toISOString();
  return { event: hydrateEvent(found) };
}

export function mockListNotifications(): { notifications: Role5Notification[] } {
  return {
    notifications: clone(notifications).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export function mockMarkNotificationRead(id: string): { notification: Role5Notification } | { code: Role5FailCode } {
  const found = notifications.find((item) => item.id === id);
  if (!found) return { code: 'NOT_FOUND' };
  found.isRead = true;
  return { notification: clone(found) };
}

export function mockGetAnalytics(filters: Role5AnalyticsFilters = {}): { analytics: Role5Analytics } {
  const from = filters.from ? Date.parse(filters.from) : Number.NEGATIVE_INFINITY;
  const to = filters.to ? Date.parse(filters.to) : Number.POSITIVE_INFINITY;

  const matched = events.filter((event) => {
    const start = Date.parse(event.startsAt);
    if (start < from || start > to) return false;
    if (filters.categoryId && event.categoryId !== filters.categoryId) return false;
    return true;
  });

  const registrationsVsCheckins = matched.map((event) => {
    const rows = attendees[event.id] ?? [];
    return {
      eventId: event.id,
      title: event.title,
      registered: rows.filter((row) => row.status === 'CONFIRMED').length,
      checkedIn: rows.filter((row) => row.checkedInAt).length,
    };
  });

  const attendanceCount = registrationsVsCheckins.reduce((sum, row) => sum + row.checkedIn, 0);

  const prediction = matched.map((event) => {
    const registered = (attendees[event.id] ?? []).filter((row) => row.status === 'CONFIRMED').length;
    const predicted = Math.min(event.capacity, Math.round(registered * 1.15 + 4));
    return {
      eventId: event.id,
      title: event.title,
      predictedAttendance: predicted,
      capacity: event.capacity,
    };
  });

  const byCategory = categories
    .map((category) => {
      const catEvents = matched.filter((event) => event.categoryId === category.id);
      const attendance = catEvents.reduce((sum, event) => {
        return sum + (attendees[event.id] ?? []).filter((row) => row.checkedInAt).length;
      }, 0);
      return {
        categoryId: category.id,
        categoryName: category.name,
        eventCount: catEvents.length,
        attendance,
      };
    })
    .filter((row) => row.eventCount > 0 || !filters.categoryId);

  return { analytics: { attendanceCount, registrationsVsCheckins, prediction, byCategory } };
}

export function analyticsQuery(filters: Role5AnalyticsFilters): string {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  const query = params.toString();
  return query ? `${ROLE5_ENDPOINTS.adminAnalytics}?${query}` : ROLE5_ENDPOINTS.adminAnalytics;
}
