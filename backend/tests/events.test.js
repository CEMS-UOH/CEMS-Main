// FR-03 (browse), FR-04 (filter) and FR-09 (details). Prisma is mocked - same pattern as
// health.test.js - so these run with no database.
jest.mock('../src/lib/prisma', () => ({
  event: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  $queryRaw: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');

const BASE = '/api/attendee/events';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';
const VENUE_ID = '33333333-3333-4333-8333-333333333333';

const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// What Prisma returns for EVENT_SELECT (note the raw `_count`).
const dbEvent = (overrides = {}) => ({
  id: EVENT_ID,
  title: 'AI Workshop',
  description: 'Hands-on intro to machine learning',
  startsAt: inDays(3),
  endsAt: inDays(3.1),
  capacity: 50,
  status: 'APPROVED',
  imageUrl: null,
  category: { id: CATEGORY_ID, name: 'Workshop' },
  venue: { id: VENUE_ID, name: 'Main Hall', building: 'A', location: null },
  organizer: { id: 'org-1', fullName: 'Dr. Khalid' },
  _count: { registrations: 12 },
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

const lastWhere = () => prisma.event.findMany.mock.calls[0][0].where;

// ---------------------------------------------------------------- FR-03 list

describe('GET /events (FR-03)', () => {
  it('lists only APPROVED events that have not ended, with seat counts', async () => {
    prisma.event.findMany.mockResolvedValueOnce([dbEvent()]);
    prisma.event.count.mockResolvedValueOnce(1);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const [event] = res.body.data.events;
    expect(event.id).toBe(EVENT_ID);
    expect(event.seatsTaken).toBe(12);
    expect(event.seatsLeft).toBe(38);
    expect(event.isFull).toBe(false);
    expect(event._count).toBeUndefined();
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });

    const args = prisma.event.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('APPROVED');
    expect(args.where.endsAt.gt).toBeInstanceOf(Date);
    expect(args.orderBy[0]).toEqual({ startsAt: 'asc' });
    // the same filter must drive the total, or pagination lies
    expect(prisma.event.count.mock.calls[0][0].where).toEqual(args.where);
  });

  it('is public - no session needed', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.event.count.mockResolvedValueOnce(0);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(200);
    expect(res.body.data.events).toEqual([]);
  });

  it('marks a full event and never reports negative seats', async () => {
    prisma.event.findMany.mockResolvedValueOnce([dbEvent({ capacity: 10, _count: { registrations: 10 } })]);
    prisma.event.count.mockResolvedValueOnce(1);

    const res = await request(app).get(BASE);

    expect(res.body.data.events[0].seatsLeft).toBe(0);
    expect(res.body.data.events[0].isFull).toBe(true);
  });

  it('never exposes the organizer email', async () => {
    prisma.event.findMany.mockResolvedValueOnce([dbEvent()]);
    prisma.event.count.mockResolvedValueOnce(1);

    await request(app).get(BASE);

    const select = prisma.event.findMany.mock.calls[0][0].select;
    expect(select.organizer).toEqual({ select: { id: true, fullName: true } });
  });

  it('paginates with page and limit', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.event.count.mockResolvedValueOnce(45);

    const res = await request(app).get(`${BASE}?page=3&limit=10`);

    expect(res.status).toBe(200);
    const args = prisma.event.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(res.body.data.pagination).toEqual({ page: 3, limit: 10, total: 45, totalPages: 5 });
  });

  it.each([
    ['page 0', 'page=0'],
    ['negative page', 'page=-1'],
    ['non-numeric limit', 'limit=abc'],
    ['limit over 50', 'limit=51'],
  ])('rejects bad pagination (%s) with 422', async (_label, qs) => {
    const res = await request(app).get(`${BASE}?${qs}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_PAGINATION');
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-04 filters

describe('GET /events filters (FR-04)', () => {
  beforeEach(() => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.event.count.mockResolvedValueOnce(0);
  });

  it('filters by category id', async () => {
    const res = await request(app).get(`${BASE}?category=${CATEGORY_ID}`);

    expect(res.status).toBe(200);
    expect(lastWhere().categoryId).toBe(CATEGORY_ID);
  });

  it('filters by venue id', async () => {
    const res = await request(app).get(`${BASE}?venue=${VENUE_ID}`);

    expect(res.status).toBe(200);
    expect(lastWhere().venueId).toBe(VENUE_ID);
  });

  it('filters by a campus day (UTC+3), matching events that overlap it', async () => {
    const res = await request(app).get(`${BASE}?date=2099-11-02`);

    expect(res.status).toBe(200);
    const where = lastWhere();
    // 2099-11-02 00:00 in Hail is 2099-11-01 21:00 UTC
    expect(where.endsAt.gt.toISOString()).toBe('2099-11-01T21:00:00.000Z');
    expect(where.startsAt.lt.toISOString()).toBe('2099-11-02T21:00:00.000Z');
  });

  it('never returns already-ended events, even for a past date', async () => {
    const before = Date.now();
    await request(app).get(`${BASE}?date=2020-01-01`);

    expect(lastWhere().endsAt.gt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('combines all filters', async () => {
    await request(app).get(`${BASE}?category=${CATEGORY_ID}&venue=${VENUE_ID}&date=2099-11-02`);

    const where = lastWhere();
    expect(where.status).toBe('APPROVED');
    expect(where.categoryId).toBe(CATEGORY_ID);
    expect(where.venueId).toBe(VENUE_ID);
    expect(where.startsAt.lt).toBeInstanceOf(Date);
  });
});

describe('GET /events invalid filters (FR-04)', () => {
  it.each([
    ['category not an id', 'category=Workshop'],
    ['venue not an id', 'venue=1'],
    ['date wrong format', 'date=02-11-2099'],
    ['date that does not exist', 'date=2099-02-30'],
    ['date month 13', 'date=2099-13-01'],
  ])('rejects %s with 422', async (_label, qs) => {
    const res = await request(app).get(`${BASE}?${qs}`);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILTER');
    expect(prisma.event.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-09 details

describe('GET /events/:id (FR-09)', () => {
  it('returns one approved event with its attachments and seat counts', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ attachments: ['https://x.test/a.pdf'] }));

    const res = await request(app).get(`${BASE}/${EVENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.event.id).toBe(EVENT_ID);
    expect(res.body.data.event.attachments).toEqual(['https://x.test/a.pdf']);
    expect(res.body.data.event.seatsLeft).toBe(38);
    expect(prisma.event.findUnique.mock.calls[0][0].where).toEqual({ id: EVENT_ID });
  });

  it.each(['PENDING', 'REJECTED', 'CANCELLED'])('hides a %s event as 404', async (status) => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status }));

    const res = await request(app).get(`${BASE}/${EVENT_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('returns 404 for an unknown id', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).get(`${BASE}/${EVENT_ID}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('returns 404 for a malformed id without touching the database', async () => {
    const res = await request(app).get(`${BASE}/not-an-id`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it('returns the standard 500 shape when the database fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.event.findUnique.mockRejectedValueOnce(new Error('boom'));

    const res = await request(app).get(`${BASE}/${EVENT_ID}`);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Internal server error');
    console.error.mockRestore();
  });
});
