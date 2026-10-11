// FR-17 (approve/reject) and the event half of FR-22 (permanent delete), plus list
// (added - see admin/events.service.js header). Prisma is mocked - same pattern as
// health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn(), findMany: jest.fn(), count: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/admin/events';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

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

const dbEvent = (overrides = {}) => ({
  id: EVENT_ID,
  title: 'AI Workshop',
  description: 'Learn AI',
  startsAt: new Date(),
  endsAt: new Date(),
  capacity: 50,
  status: 'PENDING',
  imageUrl: null,
  attachments: [],
  createdAt: new Date(),
  organizer: { id: 'organizer-1', fullName: 'Omar', email: 'omar@example.com' },
  category: { id: 'cat-1', name: 'Workshop', description: null },
  venue: { id: 'venue-1', name: 'Hall', building: null, location: null, capacity: 100 },
  _count: { registrations: 0 },
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe('admin events auth', () => {
  it.each([
    ['GET', BASE],
    ['POST', `${BASE}/${EVENT_ID}/approve`],
    ['POST', `${BASE}/${EVENT_ID}/reject`],
    ['DELETE', `${BASE}/${EVENT_ID}`],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each(['ATTENDEE', 'ORGANIZER'])('returns 403 for an %s', async (role) => {
    const res = await request(app)
      .post(`${BASE}/${EVENT_ID}/approve`)
      .set('Cookie', sessionFor({ ...admin, role }));
    expect(res.status).toBe(403);
    expect(prisma.event.update).not.toHaveBeenCalled();
  });
});

describe('POST /admin/events/:id/approve and /reject (FR-17)', () => {
  it('approves a PENDING event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status: 'PENDING' }));
    prisma.event.update.mockResolvedValueOnce(dbEvent({ status: 'APPROVED' }));

    const res = await request(app).post(`${BASE}/${EVENT_ID}/approve`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.event.status).toBe('APPROVED');
    expect(prisma.event.update.mock.calls[0][0].data).toEqual({ status: 'APPROVED' });
  });

  it('rejects a PENDING event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status: 'PENDING' }));
    prisma.event.update.mockResolvedValueOnce(dbEvent({ status: 'REJECTED' }));

    const res = await request(app).post(`${BASE}/${EVENT_ID}/reject`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.event.status).toBe('REJECTED');
  });

  it('refuses to approve a non-PENDING event with 409', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(dbEvent({ status: 'APPROVED' }));

    const res = await request(app).post(`${BASE}/${EVENT_ID}/approve`).set('Cookie', sessionFor());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_PENDING');
    expect(prisma.event.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post(`${BASE}/${EVENT_ID}/approve`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('returns 404 for a malformed id without touching the database', async () => {
    const res = await request(app).post(`${BASE}/nope/approve`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });
});

describe('DELETE /admin/events/:id (FR-22)', () => {
  it('deletes any event, regardless of status or bookings', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ id: EVENT_ID });
    prisma.event.delete.mockResolvedValueOnce({});

    const res = await request(app).delete(`${BASE}/${EVENT_ID}`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(prisma.event.delete.mock.calls[0][0]).toEqual({ where: { id: EVENT_ID } });
  });

  it('returns 404 for an unknown event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).delete(`${BASE}/${EVENT_ID}`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });
});

describe('GET /admin/events', () => {
  it('lists events across all organizers', async () => {
    prisma.event.findMany.mockResolvedValueOnce([dbEvent()]);
    prisma.event.count.mockResolvedValueOnce(1);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.events).toHaveLength(1);
    expect(res.body.data.events[0].organizer.email).toBe('omar@example.com');
    expect(prisma.event.findMany.mock.calls[0][0].where).toEqual({});
  });

  it('filters by status', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.event.count.mockResolvedValueOnce(0);

    const res = await request(app).get(`${BASE}?status=PENDING`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(prisma.event.findMany.mock.calls[0][0].where).toEqual({ status: 'PENDING' });
  });

  it('rejects an unknown status with 422', async () => {
    const res = await request(app).get(`${BASE}?status=DONE`).set('Cookie', sessionFor());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_FILTER');
  });
});
