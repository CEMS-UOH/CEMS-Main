// FR-21: one BROADCAST notification per active user. Prisma is mocked - same pattern as
// health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  notification: { createMany: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/admin/broadcast';

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

beforeEach(() => jest.resetAllMocks());

describe('POST /admin/broadcast (FR-21)', () => {
  const send = (body) => request(app).post(BASE).set('Cookie', sessionFor()).send(body);

  it('returns 401 without a session', async () => {
    const res = await request(app).post(BASE).send({ title: 'x', body: 'y' });
    expect(res.status).toBe(401);
  });

  it.each(['ATTENDEE', 'ORGANIZER'])('returns 403 for an %s', async (role) => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor({ ...admin, role }))
      .send({ title: 'x', body: 'y' });
    expect(res.status).toBe(403);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('creates one BROADCAST notification per active user', async () => {
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);
    prisma.notification.createMany.mockResolvedValueOnce({ count: 3 });

    const res = await send({ title: 'Campus closed', body: 'Due to weather.' });

    expect(res.status).toBe(201);
    expect(res.body.data.notified).toBe(3);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ isActive: true });
    const rows = prisma.notification.createMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ userId: 'u1', type: 'BROADCAST', title: 'Campus closed', body: 'Due to weather.' });
  });

  it('does nothing and reports 0 when there are no active users', async () => {
    prisma.user.findMany.mockResolvedValueOnce([]);

    const res = await send({ title: 'x', body: 'y' });

    expect(res.status).toBe(201);
    expect(res.body.data.notified).toBe(0);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('rejects a blank title with 422', async () => {
    const res = await send({ title: '  ', body: 'y' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_TITLE');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('rejects a blank body with 422', async () => {
    const res = await send({ title: 'x', body: '' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_BODY');
  });
});
