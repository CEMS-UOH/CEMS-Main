// The notification inbox (FR-06, FR-15, FR-21, FR-17 outcome). Prisma is mocked - same
// pattern as health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/notifications';
const NOTE_ID = '22222222-2222-4222-8222-222222222222';

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

const note = (overrides = {}) => ({
  id: NOTE_ID,
  type: 'BOOKING_CONFIRMATION',
  title: 'AI Workshop',
  body: 'Your seat is booked.',
  isRead: false,
  createdAt: new Date('2026-10-20T10:00:00Z'),
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe('notifications auth', () => {
  it.each([
    ['GET', BASE],
    ['POST', `${BASE}/read-all`],
    ['POST', `${BASE}/${NOTE_ID}/read`],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each(['ATTENDEE', 'ORGANIZER', 'ADMIN'])('lets an %s read their own inbox', async (role) => {
    prisma.notification.findMany.mockResolvedValueOnce([]);
    prisma.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const res = await request(app).get(BASE).set('Cookie', sessionFor({ ...attendee, role }));

    expect(res.status).toBe(200);
  });
});

describe('GET /api/notifications', () => {
  it('lists only the caller’s notifications, newest first, with the unread count', async () => {
    prisma.notification.findMany.mockResolvedValueOnce([note()]);
    prisma.notification.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.unreadCount).toBe(1);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    const query = prisma.notification.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ userId: 'user-1' });
    expect(query.orderBy[0]).toEqual({ createdAt: 'desc' });
  });

  it('filters to unread ones with ?unread=true', async () => {
    prisma.notification.findMany.mockResolvedValueOnce([]);
    prisma.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    await request(app).get(`${BASE}?unread=true&page=2&limit=5`).set('Cookie', sessionFor());

    const query = prisma.notification.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ userId: 'user-1', isRead: false });
    expect(query.skip).toBe(5);
    expect(query.take).toBe(5);
  });

  it.each([
    ['unread=yes', 'INVALID_FILTER'],
    ['page=0', 'INVALID_PAGINATION'],
    ['limit=51', 'INVALID_PAGINATION'],
    ['limit=abc', 'INVALID_PAGINATION'],
  ])('rejects ?%s with 422 %s', async (query, code) => {
    const res = await request(app).get(`${BASE}?${query}`).set('Cookie', sessionFor());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe(code);
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });
});

describe('POST /api/notifications/:id/read', () => {
  it('marks the caller’s own notification read', async () => {
    prisma.notification.findUnique.mockResolvedValueOnce({ userId: 'user-1', isRead: false });
    prisma.notification.update.mockResolvedValueOnce(note({ isRead: true }));

    const res = await request(app).post(`${BASE}/${NOTE_ID}/read`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.notification.isRead).toBe(true);
    expect(prisma.notification.update.mock.calls[0][0].data).toEqual({ isRead: true });
  });

  it('reports someone else’s notification as not found, and changes nothing', async () => {
    prisma.notification.findUnique.mockResolvedValueOnce({ userId: 'someone-else', isRead: false });

    const res = await request(app).post(`${BASE}/${NOTE_ID}/read`).set('Cookie', sessionFor());

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOTIFICATION_NOT_FOUND');
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown id', async () => {
    prisma.notification.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).post(`${BASE}/${NOTE_ID}/read`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed id without touching the database', async () => {
    const res = await request(app).post(`${BASE}/not-an-id/read`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(prisma.notification.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/notifications/read-all', () => {
  it('marks every unread notification of the caller read', async () => {
    prisma.notification.updateMany.mockResolvedValueOnce({ count: 3 });

    const res = await request(app).post(`${BASE}/read-all`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ updated: 3 });
    expect(prisma.notification.updateMany.mock.calls[0][0]).toEqual({
      where: { userId: 'user-1', isRead: false },
      data: { isRead: true },
    });
  });
});
