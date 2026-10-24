// FR-20: admin analytics - descriptive numbers from the database, and attendance predictions
// from the Python analytics service. Prisma and fetch are mocked: no database, no service.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn(), groupBy: jest.fn() },
  event: { groupBy: jest.fn(), findMany: jest.fn() },
  registration: { groupBy: jest.fn() },
  feedback: { aggregate: jest.fn() },
  $queryRaw: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const env = require('../src/config/env');
const { monthWindow } = require('../src/modules/analytics/analytics.service');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/admin/analytics';

const admin = {
  id: 'admin-1',
  email: 'admin@example.com',
  fullName: 'The Admin',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date(),
};

const sessionFor = (user = admin) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

const realFetch = global.fetch;

beforeEach(() => {
  jest.resetAllMocks();
  env.analyticsUrl = 'http://analytics.test';
  global.fetch = jest.fn();
});
afterAll(() => {
  global.fetch = realFetch;
});

/** The nine overview queries, in the order the service runs them. */
function mockOverview() {
  prisma.event.groupBy.mockResolvedValueOnce([
    { status: 'APPROVED', _count: { _all: 6 } },
    { status: 'PENDING', _count: { _all: 2 } },
  ]);
  prisma.user.groupBy.mockResolvedValueOnce([
    { role: 'ATTENDEE', _count: { _all: 40 } },
    { role: 'ORGANIZER', _count: { _all: 3 } },
    { role: 'ADMIN', _count: { _all: 1 } },
  ]);
  prisma.registration.groupBy.mockResolvedValueOnce([
    { status: 'CONFIRMED', _count: { _all: 90 } },
    { status: 'CANCELLED', _count: { _all: 10 } },
  ]);
  prisma.feedback.aggregate.mockResolvedValueOnce({ _avg: { rating: 4.26 }, _count: { _all: 25 } });
  prisma.$queryRaw
    .mockResolvedValueOnce([{ confirmed: 50, checkedIn: 40 }]) // attendance
    .mockResolvedValueOnce([
      { id: 'cat-1', name: 'Workshop', events: 4, bookings: 70, checkIns: 30 },
      { id: 'cat-2', name: 'Sports', events: 0, bookings: 0, checkIns: 0 },
    ])
    .mockResolvedValueOnce([{ id: 'cat-1', averageRating: 4.4, ratings: 20 }])
    .mockResolvedValueOnce([]) // by month
    .mockResolvedValueOnce([
      {
        id: 'e-1',
        title: 'AI Workshop',
        startsAt: new Date('2026-10-01T10:00:00Z'),
        endsAt: new Date('2026-10-01T12:00:00Z'),
        capacity: 50,
        bookings: 45,
        checkIns: 40,
        averageRating: 4.5,
      },
    ]);
}

describe('analytics auth', () => {
  it.each([BASE, `${BASE}/predictions`])('GET %s returns 401 without a session', async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  it.each(['ATTENDEE', 'ORGANIZER'])('refuses an %s with 403', async (role) => {
    const res = await request(app).get(BASE).set('Cookie', sessionFor({ ...admin, role }));
    expect(res.status).toBe(403);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('GET /api/admin/analytics', () => {
  it('returns totals, categories, months and top events', async () => {
    mockOverview();

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    const { totals, byCategory, byMonth, topEvents } = res.body.data;
    expect(totals.events).toEqual({ total: 8, pending: 2, approved: 6, rejected: 0, cancelled: 0 });
    expect(totals.users).toEqual({ total: 44, attendees: 40, organizers: 3, admins: 1 });
    expect(totals.bookings).toEqual({ confirmed: 90, cancelled: 10 });
    expect(totals.attendance).toEqual({ confirmed: 50, checkedIn: 40, rate: 0.8 });
    expect(totals.ratings).toEqual({ count: 25, average: 4.3 });
    expect(byCategory[0]).toMatchObject({ name: 'Workshop', averageRating: 4.4, ratings: 20 });
    expect(byCategory[1]).toMatchObject({ name: 'Sports', averageRating: null, ratings: 0 });
    expect(byMonth).toHaveLength(8);
    expect(byMonth.every((m) => m.events === 0)).toBe(true);
    expect(topEvents[0]).toMatchObject({ title: 'AI Workshop', fillRate: 0.9 });
  });

  it('gives null rates when there is nothing to divide by', async () => {
    mockOverview();
    prisma.$queryRaw.mockReset();
    prisma.$queryRaw
      .mockResolvedValueOnce([{ confirmed: 0, checkedIn: 0 }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.feedback.aggregate.mockReset();
    prisma.feedback.aggregate.mockResolvedValueOnce({ _avg: { rating: null }, _count: { _all: 0 } });

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.body.data.totals.attendance.rate).toBeNull();
    expect(res.body.data.totals.ratings.average).toBeNull();
  });
});

describe('monthWindow', () => {
  it('covers five months back to two ahead, in campus time, across a year end', () => {
    // 22:30 UTC on 31 Dec is already 1 January on campus (UTC+3).
    expect(monthWindow(new Date('2026-12-31T22:30:00Z'))).toEqual([
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03',
    ]);
  });
});

describe('GET /api/admin/analytics/predictions', () => {
  const upcomingEvent = {
    id: 'up-1',
    title: 'Hackathon',
    startsAt: new Date(Date.now() + 7 * 864e5),
    endsAt: new Date(Date.now() + 7 * 864e5 + 3 * 3600e3),
    createdAt: new Date(Date.now() - 864e5),
    capacity: 100,
    category: { name: 'Competition' },
    _count: { registrations: 30 },
  };

  it('sends features (no titles, no people) to the service and returns its predictions with titles', async () => {
    prisma.event.findMany
      .mockResolvedValueOnce([
        {
          ...upcomingEvent,
          id: 'past-1',
          startsAt: new Date('2026-09-01T15:00:00Z'),
          endsAt: new Date('2026-09-01T17:00:00Z'),
          createdAt: new Date('2026-08-20T15:00:00Z'),
          registrations: [{ id: 'r1' }, { id: 'r2' }],
        },
      ])
      .mockResolvedValueOnce([upcomingEvent]);
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          method: 'baseline',
          trainedOn: 1,
          showUpRate: 0.8,
          predictions: [{ eventId: 'up-1', expectedBookings: 72, expectedAttendance: 58 }],
        },
      }),
    });

    const res = await request(app).get(`${BASE}/predictions`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.method).toBe('baseline');
    expect(res.body.data.predictions[0]).toMatchObject({
      eventId: 'up-1',
      title: 'Hackathon',
      bookingsSoFar: 30,
      expectedBookings: 72,
      expectedAttendance: 58,
    });

    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe('http://analytics.test/predict-attendance');
    const sent = JSON.parse(init.body);
    // 15:00 UTC on a Tuesday is 18:00 on campus.
    expect(sent.history[0]).toMatchObject({ eventId: 'past-1', category: 'Competition', hour: 18, weekday: 2, durationHours: 2, bookings: 30, checkIns: 2 });
    expect(sent.history[0].title).toBeUndefined();
    expect(sent.upcoming[0]).toMatchObject({ eventId: 'up-1', capacity: 100, bookings: 30 });
  });

  it('answers 503 ANALYTICS_UNAVAILABLE when the service is down', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([upcomingEvent]);
    global.fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get(`${BASE}/predictions`).set('Cookie', sessionFor());

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ANALYTICS_UNAVAILABLE');
    console.error.mockRestore();
  });

  it('answers 503 when no service is configured, without touching the database', async () => {
    env.analyticsUrl = '';
    const res = await request(app).get(`${BASE}/predictions`).set('Cookie', sessionFor());
    expect(res.status).toBe(503);
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty list without calling the service when nothing is upcoming', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const res = await request(app).get(`${BASE}/predictions`).set('Cookie', sessionFor());
    expect(res.status).toBe(200);
    expect(res.body.data.predictions).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
