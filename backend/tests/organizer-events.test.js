// FR-10 (create), FR-11 (edit), FR-12 (delete), FR-13 (capacity rules), FR-16 (image/attachment
// URLs), plus list/get (added - see organizer/events.service.js header) and the read-only
// venues/categories lookups. Prisma is mocked - same pattern as health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  category: { findUnique: jest.fn(), findMany: jest.fn() },
  venue: { findUnique: jest.fn(), findMany: jest.fn() },
  registration: { count: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/organizer/events';
const ORGANIZER_ID = 'organizer-1';
const OTHER_ORGANIZER_ID = 'organizer-2';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const VENUE_ID = '33333333-3333-4333-8333-333333333333';

const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const organizer = {
  id: ORGANIZER_ID,
  email: 'omar@example.com',
  fullName: 'Omar the Organizer',
  role: 'ORGANIZER',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** requireAuth loads the user on every request - queue that lookup and return the cookie. */
const sessionFor = (user = organizer) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

const category = { id: CATEGORY_ID, name: 'Workshop', description: null };
const venue = { id: VENUE_ID, name: 'Main Hall', building: 'A', location: null, capacity: 100 };

const dbEvent = (overrides = {}) => ({
  id: EVENT_ID,
  title: 'AI Workshop',
  description: 'Learn AI basics',
  startsAt: inDays(5),
  endsAt: inDays(5.1),
  capacity: 50,
  status: 'PENDING',
  imageUrl: null,
  attachments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  category,
  venue,
  organizerId: ORGANIZER_ID,
  _count: { registrations: 0 },
  ...overrides,
});

const validBody = () => ({
  title: 'AI Workshop',
  description: 'Learn AI basics',
  startsAt: inDays(5).toISOString(),
  endsAt: inDays(5.1).toISOString(),
  capacity: 50,
  categoryId: CATEGORY_ID,
  venueId: VENUE_ID,
});

// resetAllMocks (not clearAllMocks) - clearAllMocks leaves queued mockResolvedValueOnce
// implementations in place, so an unconsumed one from a short-circuited test would bleed
// into the next test's first call to that mock.
beforeEach(() => jest.resetAllMocks());

// ---------------------------------------------------------------- auth guard

describe('organizer events auth', () => {
  it.each([
    ['POST', BASE],
    ['GET', BASE],
    ['GET', `${BASE}/${EVENT_ID}`],
    ['PATCH', `${BASE}/${EVENT_ID}`],
    ['DELETE', `${BASE}/${EVENT_ID}`],
    ['GET', `${BASE}/${EVENT_ID}/attendees`],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each(['ATTENDEE', 'ADMIN'])('returns 403 for an %s', async (role) => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor({ ...organizer, role }))
      .send(validBody());

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-10 create

describe('POST /organizer/events (FR-10)', () => {
  const create = (body) => request(app).post(BASE).set('Cookie', sessionFor()).send(body);

  it('creates a PENDING event owned by the session user', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(category);
    prisma.venue.findUnique.mockResolvedValueOnce(venue);
    prisma.event.create.mockResolvedValueOnce(dbEvent());

    const res = await create(validBody());

    expect(res.status).toBe(201);
    expect(res.body.data.event.status).toBe('PENDING');
    const data = prisma.event.create.mock.calls[0][0].data;
    expect(data.organizerId).toBe(ORGANIZER_ID);
    expect(data.status).toBe('PENDING');
  });

  it('ignores organizerId and status sent by the client', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(category);
    prisma.venue.findUnique.mockResolvedValueOnce(venue);
    prisma.event.create.mockResolvedValueOnce(dbEvent());

    await create({ ...validBody(), organizerId: 'someone-else', status: 'APPROVED' });

    const data = prisma.event.create.mock.calls[0][0].data;
    expect(data.organizerId).toBe(ORGANIZER_ID);
    expect(data.status).toBe('PENDING');
  });

  it('allows creating without a venue', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(category);
    prisma.event.create.mockResolvedValueOnce(dbEvent({ venue: null }));

    const { venueId, ...body } = validBody();
    const res = await create(body);

    expect(res.status).toBe(201);
    expect(prisma.venue.findUnique).not.toHaveBeenCalled();
    expect(prisma.event.create.mock.calls[0][0].data.venueId).toBeNull();
  });

  it.each([
    ['missing title', { ...validBody(), title: '' }, 'INVALID_TITLE'],
    ['missing description', { ...validBody(), description: '  ' }, 'INVALID_DESCRIPTION'],
    ['endsAt before startsAt', { ...validBody(), endsAt: inDays(1).toISOString() }, 'INVALID_DATES'],
    ['startsAt in the past', { ...validBody(), startsAt: inDays(-1).toISOString() }, 'INVALID_DATES'],
    ['capacity not a positive integer', { ...validBody(), capacity: 0 }, 'INVALID_CAPACITY'],
    ['capacity not a number', { ...validBody(), capacity: '50' }, 'INVALID_CAPACITY'],
    ['malformed categoryId', { ...validBody(), categoryId: 'nope' }, 'INVALID_CATEGORY'],
    ['malformed venueId', { ...validBody(), venueId: 'nope' }, 'INVALID_VENUE'],
    ['imageUrl not http(s)', { ...validBody(), imageUrl: 'javascript:alert(1)' }, 'INVALID_IMAGE_URL'],
    ['an attachment not http(s)', { ...validBody(), attachments: ['ftp://x'] }, 'INVALID_ATTACHMENTS'],
    ['too many attachments', { ...validBody(), attachments: Array(11).fill('https://x.test/a') }, 'INVALID_ATTACHMENTS'],
  ])('rejects %s with 422', async (_label, body, code) => {
    const res = await create(body);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(code);
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown category with 422 before touching the venue', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(null);

    const res = await create(validBody());

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown venue with 422', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(category);
    prisma.venue.findUnique.mockResolvedValueOnce(null);

    const res = await create(validBody());

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_VENUE');
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('rejects FR-13: capacity above the venue capacity', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(category);
    prisma.venue.findUnique.mockResolvedValueOnce({ ...venue, capacity: 10 });

    const res = await create({ ...validBody(), capacity: 50 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CAPACITY_EXCEEDS_VENUE');
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it('accepts capacity exactly equal to the venue capacity', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(category);
    prisma.venue.findUnique.mockResolvedValueOnce({ ...venue, capacity: 50 });
    prisma.event.create.mockResolvedValueOnce(dbEvent());

    const res = await create({ ...validBody(), capacity: 50 });

    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------- FR-11 edit

describe('PATCH /organizer/events/:id (FR-11)', () => {
  const edit = (body, id = EVENT_ID) =>
    request(app).patch(`${BASE}/${id}`).set('Cookie', sessionFor()).send(body);

  it('edits the organizer’s own PENDING event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent());
    prisma.registration.count.mockResolvedValueOnce(0);
    prisma.event.update.mockResolvedValueOnce(dbEvent({ title: 'New title' }));

    const res = await edit({ title: 'New title' });

    expect(res.status).toBe(200);
    expect(res.body.data.event.title).toBe('New title');
    expect(prisma.event.update.mock.calls[0][0].data).toEqual({ title: 'New title' });
  });

  it('edits an APPROVED event too', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status: 'APPROVED' }));
    prisma.registration.count.mockResolvedValueOnce(0);
    prisma.event.update.mockResolvedValueOnce(dbEvent({ status: 'APPROVED', title: 'Updated' }));

    const res = await edit({ title: 'Updated' });

    expect(res.status).toBe(200);
  });

  it('returns 404 for a malformed id without touching the database', async () => {
    const res = await edit({ title: 'x' }, 'nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await edit({ title: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('returns 404 for another organizer’s event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ organizerId: OTHER_ORGANIZER_ID }));
    const res = await edit({ title: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('refuses to edit a REJECTED event with 409', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status: 'REJECTED' }));
    const res = await edit({ title: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('refuses to edit a CANCELLED event with 409', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status: 'CANCELLED' }));
    const res = await edit({ title: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('refuses to edit an event that already started with 409', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ startsAt: inDays(-0.01) }));
    const res = await edit({ title: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_ALREADY_STARTED');
  });

  it('rejects FR-13: lowering capacity below confirmed bookings', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ capacity: 50 }));
    prisma.registration.count.mockResolvedValueOnce(30);

    const res = await edit({ capacity: 20 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CAPACITY_BELOW_BOOKED');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('accepts capacity equal to confirmed bookings', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ capacity: 50 }));
    prisma.registration.count.mockResolvedValueOnce(30);
    prisma.event.update.mockResolvedValueOnce(dbEvent({ capacity: 30 }));

    const res = await edit({ capacity: 30 });

    expect(res.status).toBe(200);
  });

  it('re-checks the new venue’s capacity when venueId changes', async () => {
    const OTHER_VENUE_ID = '44444444-4444-4444-8444-444444444444';
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ capacity: 50 }));
    prisma.venue.findUnique.mockResolvedValueOnce({ ...venue, id: OTHER_VENUE_ID, capacity: 10 });
    prisma.registration.count.mockResolvedValueOnce(0);

    const res = await edit({ venueId: OTHER_VENUE_ID });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CAPACITY_EXCEEDS_VENUE');
  });

  it('clears the venue when venueId is sent as null', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent());
    prisma.registration.count.mockResolvedValueOnce(0);
    prisma.event.update.mockResolvedValueOnce(dbEvent({ venue: null }));

    const res = await edit({ venueId: null });

    expect(res.status).toBe(200);
    expect(prisma.venue.findUnique).not.toHaveBeenCalled();
    expect(prisma.event.update.mock.calls[0][0].data.venueId).toBeNull();
  });

  it('rejects an unknown category on edit with 422', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent());
    prisma.category.findUnique.mockResolvedValueOnce(null);

    const res = await edit({ categoryId: CATEGORY_ID });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_CATEGORY');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('rejects startsAt without endsAt (must change together)', async () => {
    const res = await edit({ startsAt: inDays(6).toISOString() });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_DATES');
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-12 delete

describe('DELETE /organizer/events/:id (FR-12)', () => {
  const del = (id = EVENT_ID) => request(app).delete(`${BASE}/${id}`).set('Cookie', sessionFor());

  it('deletes the organizer’s own event with no bookings, before it starts', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({
      id: EVENT_ID,
      organizerId: ORGANIZER_ID,
      startsAt: inDays(5),
    });
    prisma.registration.count.mockResolvedValueOnce(0);
    prisma.event.delete.mockResolvedValueOnce({});

    const res = await del();

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(prisma.event.delete.mock.calls[0][0]).toEqual({ where: { id: EVENT_ID } });
  });

  it('refuses with 409 when the event has confirmed bookings', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({
      id: EVENT_ID,
      organizerId: ORGANIZER_ID,
      startsAt: inDays(5),
    });
    prisma.registration.count.mockResolvedValueOnce(3);

    const res = await del();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_HAS_BOOKINGS');
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it('refuses with 409 once the event has started', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({
      id: EVENT_ID,
      organizerId: ORGANIZER_ID,
      startsAt: inDays(-0.01),
    });

    const res = await del();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_ALREADY_STARTED');
    expect(prisma.registration.count).not.toHaveBeenCalled();
  });

  it('returns 404 for another organizer’s event and deletes nothing', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({
      id: EVENT_ID,
      organizerId: OTHER_ORGANIZER_ID,
      startsAt: inDays(5),
    });

    const res = await del();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await del();
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });
});

// ---------------------------------------------------------------- list / details

describe('GET /organizer/events', () => {
  it('lists only the caller’s own events', async () => {
    prisma.event.findMany.mockResolvedValueOnce([dbEvent()]);
    prisma.event.count.mockResolvedValueOnce(1);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.events).toHaveLength(1);
    expect(prisma.event.findMany.mock.calls[0][0].where).toEqual({ organizerId: ORGANIZER_ID });
  });

  it('filters by status', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.event.count.mockResolvedValueOnce(0);

    const res = await request(app).get(`${BASE}?status=APPROVED`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(prisma.event.findMany.mock.calls[0][0].where).toEqual({
      organizerId: ORGANIZER_ID,
      status: 'APPROVED',
    });
  });

  it('rejects an unknown status with 422', async () => {
    const res = await request(app).get(`${BASE}?status=DONE`).set('Cookie', sessionFor());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_FILTER');
  });
});

describe('GET /organizer/events/:id', () => {
  it('returns the organizer’s own event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent());
    const res = await request(app).get(`${BASE}/${EVENT_ID}`).set('Cookie', sessionFor());
    expect(res.status).toBe(200);
    expect(res.body.data.event.id).toBe(EVENT_ID);
  });

  it('returns 404 for another organizer’s event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ organizerId: OTHER_ORGANIZER_ID }));
    const res = await request(app).get(`${BASE}/${EVENT_ID}`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });
});

// ---------------------------------------------------------------- read-only venues/categories

describe('GET /organizer/venues and /organizer/categories', () => {
  it('lists venues', async () => {
    prisma.venue.findMany.mockResolvedValueOnce([venue]);
    const res = await request(app).get('/api/organizer/venues').set('Cookie', sessionFor());
    expect(res.status).toBe(200);
    expect(res.body.data.venues).toEqual([venue]);
  });

  it('lists categories', async () => {
    prisma.category.findMany.mockResolvedValueOnce([category]);
    const res = await request(app).get('/api/organizer/categories').set('Cookie', sessionFor());
    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([category]);
  });

  it('requires a session', async () => {
    const res = await request(app).get('/api/organizer/venues');
    expect(res.status).toBe(401);
  });
});
