// "Recommended for you" (GET /api/attendee/recommendations). Prisma is mocked - same pattern
// as health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  registration: { findMany: jest.fn() },
  feedback: { findMany: jest.fn() },
  event: { findMany: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/attendee/recommendations';

const attendee = {
  id: 'user-1',
  email: 'sara@example.com',
  fullName: 'Sara',
  role: 'ATTENDEE',
  isActive: true,
  createdAt: new Date(),
};

const sessionFor = (user = attendee) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

const inDays = (n) => new Date(Date.now() + n * 864e5);

/** An upcoming event row as the service selects it. */
const upcoming = (id, { category = 'cat-workshop', organizer = 'org-1', taken = 0, capacity = 100, days = 5 } = {}) => ({
  id,
  title: `Event ${id}`,
  description: 'x',
  startsAt: inDays(days),
  endsAt: inDays(days + 0.1),
  capacity,
  status: 'APPROVED',
  imageUrl: null,
  category: { id: category, name: category },
  venue: null,
  organizer: { id: organizer, fullName: 'Org' },
  _count: { registrations: taken },
  organizerId: organizer,
  categoryId: category,
});

const booked = (category, organizer = 'org-1') => ({ event: { categoryId: category, organizerId: organizer } });

beforeEach(() => jest.resetAllMocks());

describe('recommendations auth', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it.each(['ORGANIZER', 'ADMIN'])('refuses an %s with 403', async (role) => {
    const res = await request(app).get(BASE).set('Cookie', sessionFor({ ...attendee, role }));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/attendee/recommendations', () => {
  it('puts events from the categories the attendee books first, and says why', async () => {
    prisma.registration.findMany.mockResolvedValueOnce([booked('cat-workshop'), booked('cat-workshop')]);
    prisma.feedback.findMany.mockResolvedValueOnce([]);
    prisma.event.findMany.mockResolvedValueOnce([
      upcoming('sports', { category: 'cat-sports', organizer: 'org-2', taken: 90 }), // popular, other topic
      upcoming('workshop', { category: 'cat-workshop', taken: 5 }),
    ]);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.basis).toBe('history');
    expect(res.body.data.events[0]).toMatchObject({ id: 'workshop', reason: 'CATEGORY' });
    expect(res.body.data.events[0].organizerId).toBeUndefined(); // public shape only
  });

  it('lets a bad rating push a category down', async () => {
    prisma.registration.findMany.mockResolvedValueOnce([booked('cat-sports', 'org-2'), booked('cat-workshop')]);
    prisma.feedback.findMany.mockResolvedValueOnce([
      { rating: 1, event: { categoryId: 'cat-sports', organizerId: 'org-2' } },
      { rating: 5, event: { categoryId: 'cat-workshop', organizerId: 'org-1' } },
    ]);
    prisma.event.findMany.mockResolvedValueOnce([
      upcoming('sports', { category: 'cat-sports', organizer: 'org-2' }),
      upcoming('workshop', { category: 'cat-workshop' }),
    ]);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.body.data.events.map((e) => e.id)).toEqual(['workshop', 'sports']);
  });

  it('shows the most-booked events to a new attendee, and says so', async () => {
    prisma.registration.findMany.mockResolvedValueOnce([]);
    prisma.feedback.findMany.mockResolvedValueOnce([]);
    prisma.event.findMany.mockResolvedValueOnce([
      upcoming('quiet', { taken: 2 }),
      upcoming('busy', { taken: 80 }),
    ]);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.body.data.basis).toBe('popular');
    expect(res.body.data.events.map((e) => e.id)).toEqual(['busy', 'quiet']);
    expect(res.body.data.events[0].reason).toBe('POPULAR');
  });

  it('never suggests a full event, and at most four', async () => {
    prisma.registration.findMany.mockResolvedValueOnce([]);
    prisma.feedback.findMany.mockResolvedValueOnce([]);
    prisma.event.findMany.mockResolvedValueOnce([
      upcoming('full', { taken: 100, capacity: 100 }),
      ...['a', 'b', 'c', 'd', 'e'].map((id) => upcoming(id, { taken: 10 })),
    ]);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    const ids = res.body.data.events.map((e) => e.id);
    expect(ids).not.toContain('full');
    expect(ids).toHaveLength(4);
  });

  it('only asks for approved, not-started events the attendee has not booked', async () => {
    prisma.registration.findMany.mockResolvedValueOnce([]);
    prisma.feedback.findMany.mockResolvedValueOnce([]);
    prisma.event.findMany.mockResolvedValueOnce([]);

    await request(app).get(BASE).set('Cookie', sessionFor());

    const { where } = prisma.event.findMany.mock.calls[0][0];
    expect(where.status).toBe('APPROVED');
    expect(where.startsAt.gt).toBeInstanceOf(Date);
    expect(where.registrations).toEqual({ none: { userId: 'user-1', status: 'CONFIRMED' } });
    expect(prisma.registration.findMany.mock.calls[0][0].where).toEqual({ userId: 'user-1', status: 'CONFIRMED' });
    expect(prisma.feedback.findMany.mock.calls[0][0].where).toEqual({ userId: 'user-1' });
  });
});
