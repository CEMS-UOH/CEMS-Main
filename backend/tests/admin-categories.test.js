// FR-19: category CRUD. Prisma is mocked - same pattern as health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  category: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  event: { count: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/admin/categories';
const CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

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

const dbCategory = (overrides = {}) => ({
  id: CATEGORY_ID,
  name: 'Workshop',
  description: null,
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe('admin categories auth', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it.each(['ATTENDEE', 'ORGANIZER'])('returns 403 for an %s', async (role) => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor({ ...admin, role }))
      .send({ name: 'X' });
    expect(res.status).toBe(403);
    expect(prisma.category.create).not.toHaveBeenCalled();
  });
});

describe('GET /admin/categories (FR-19)', () => {
  it('lists categories with their event count', async () => {
    prisma.category.findMany.mockResolvedValueOnce([
      { ...dbCategory(), _count: { events: 3 } },
    ]);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.categories[0].eventCount).toBe(3);
  });
});

describe('POST /admin/categories (FR-19)', () => {
  const create = (body) => request(app).post(BASE).set('Cookie', sessionFor()).send(body);

  it('creates a category', async () => {
    prisma.category.create.mockResolvedValueOnce(dbCategory());
    const res = await create({ name: 'Workshop' });
    expect(res.status).toBe(201);
    expect(res.body.data.category.name).toBe('Workshop');
  });

  it('rejects a blank name with 422', async () => {
    const res = await create({ name: '  ' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_NAME');
    expect(prisma.category.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate name with 409', async () => {
    prisma.category.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    const res = await create({ name: 'Workshop' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_NAME_TAKEN');
  });
});

describe('PATCH /admin/categories/:id (FR-19)', () => {
  const update = (body, id = CATEGORY_ID) =>
    request(app).patch(`${BASE}/${id}`).set('Cookie', sessionFor()).send(body);

  it('updates a category', async () => {
    prisma.category.findUnique.mockResolvedValueOnce({ id: CATEGORY_ID });
    prisma.category.update.mockResolvedValueOnce(dbCategory({ name: 'Seminar' }));

    const res = await update({ name: 'Seminar' });

    expect(res.status).toBe(200);
    expect(res.body.data.category.name).toBe('Seminar');
  });

  it('returns 404 for an unknown category', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(null);
    const res = await update({ name: 'Seminar' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
  });

  it('returns 404 for a malformed id without touching the database', async () => {
    const res = await update({ name: 'Seminar' }, 'nope');
    expect(res.status).toBe(404);
    expect(prisma.category.findUnique).not.toHaveBeenCalled();
  });
});

describe('DELETE /admin/categories/:id (FR-19)', () => {
  const del = (id = CATEGORY_ID) => request(app).delete(`${BASE}/${id}`).set('Cookie', sessionFor());

  it('deletes a category with no events', async () => {
    prisma.category.findUnique.mockResolvedValueOnce({ id: CATEGORY_ID });
    prisma.event.count.mockResolvedValueOnce(0);
    prisma.category.delete.mockResolvedValueOnce({});

    const res = await del();

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it('refuses with 409 when events still use this category', async () => {
    prisma.category.findUnique.mockResolvedValueOnce({ id: CATEGORY_ID });
    prisma.event.count.mockResolvedValueOnce(5);

    const res = await del();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_HAS_EVENTS');
    expect(prisma.category.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown category', async () => {
    prisma.category.findUnique.mockResolvedValueOnce(null);
    const res = await del();
    expect(res.status).toBe(404);
  });
});
