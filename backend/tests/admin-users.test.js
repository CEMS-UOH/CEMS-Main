// FR-18 (manage users) and the user half of FR-22 (permanent delete).
// Prisma is mocked - same pattern as health.test.js.
//
// prisma.user.findUnique is called for TWO different reasons in these routes: requireAuth's
// session lookup, and the service's own business lookups (duplicate email, loadUser). Both
// share the same mock function, so a FIFO mockResolvedValueOnce queue would consume values in
// an order that depends on which lines of test code happen to run first - fragile and easy to
// get backwards. Instead it is driven by a small keyed fixture store, looked up by the same
// `where` shape Prisma would use (id or email), so call order never matters.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  event: { count: jest.fn() },
  registration: { count: jest.fn() },
  feedback: { count: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/admin/users';
// Real UUID-shaped ids - the controller's isUuid() guard 404s anything else before the
// service (and its mock-backed Prisma calls) is ever reached.
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const TARGET_ID = '99999999-9999-4999-8999-999999999999';

const admin = {
  id: ADMIN_ID,
  email: 'admin@example.com',
  fullName: 'The Admin',
  role: 'ADMIN',
  isActive: true,
  createdAt: new Date(),
};

// Used to seed prisma.user.findUnique (no `select` in the service's loadUser - a real row).
const targetUser = (overrides = {}) => ({
  id: TARGET_ID,
  email: 'target@example.com',
  fullName: 'Target User',
  role: 'ATTENDEE',
  isActive: true,
  passwordHash: 'hash',
  createdAt: new Date(),
  ...overrides,
});

// Used for mocked create()/update() RETURN values - the service always passes
// `select: USER_SELECT` there, so passwordHash would never actually come back.
const publicUser = (overrides = {}) => {
  const { passwordHash, ...rest } = targetUser(overrides);
  return rest;
};

let byId;
let byEmail;

/** Makes `user` findable by both id and email, the way Prisma's real table would be. */
function seedUser(user) {
  byId[user.id] = user;
  if (user.email) byEmail[user.email] = user;
}

/** Registers the session user as a fixture and returns the cookie - does not touch the mock queue. */
const sessionFor = (user = admin) => {
  seedUser(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

beforeEach(() => {
  jest.resetAllMocks();
  byId = {};
  byEmail = {};
  prisma.user.findUnique.mockImplementation(({ where }) => {
    if (where && where.id !== undefined) return Promise.resolve(byId[where.id] ?? null);
    if (where && where.email !== undefined) return Promise.resolve(byEmail[where.email] ?? null);
    return Promise.resolve(null);
  });
});

// ---------------------------------------------------------------- auth guard

describe('admin users auth', () => {
  it.each([
    ['GET', BASE],
    ['POST', BASE],
    ['POST', `${BASE}/${TARGET_ID}/activate`],
    ['POST', `${BASE}/${TARGET_ID}/deactivate`],
    ['POST', `${BASE}/${TARGET_ID}/role`],
    ['DELETE', `${BASE}/${TARGET_ID}`],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);
    expect(res.status).toBe(401);
  });

  it.each(['ATTENDEE', 'ORGANIZER'])('returns 403 for an %s', async (role) => {
    const res = await request(app).get(BASE).set('Cookie', sessionFor({ ...admin, role }));
    expect(res.status).toBe(403);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-18 list

describe('GET /admin/users (FR-18)', () => {
  it('lists users, filtered by role', async () => {
    const cookie = sessionFor();
    prisma.user.findMany.mockResolvedValueOnce([targetUser({ role: 'ORGANIZER' })]);
    prisma.user.count.mockResolvedValueOnce(1);

    const res = await request(app).get(`${BASE}?role=ORGANIZER`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ role: 'ORGANIZER' });
  });

  it('searches by name or email with q', async () => {
    const cookie = sessionFor();
    prisma.user.findMany.mockResolvedValueOnce([]);
    prisma.user.count.mockResolvedValueOnce(0);

    const res = await request(app).get(`${BASE}?q=sara`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(prisma.user.findMany.mock.calls[0][0].where.OR).toEqual([
      { email: { contains: 'sara', mode: 'insensitive' } },
      { fullName: { contains: 'sara', mode: 'insensitive' } },
    ]);
  });

  it('rejects an unknown role with 422', async () => {
    const res = await request(app).get(`${BASE}?role=NOPE`).set('Cookie', sessionFor());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_FILTER');
  });
});

// ---------------------------------------------------------------- FR-18 create

describe('POST /admin/users (FR-18)', () => {
  const validBody = (role = 'ORGANIZER') => ({
    email: 'new.organizer@example.com',
    password: 'longenough1',
    fullName: 'New Organizer',
    role,
  });

  it('creates an ORGANIZER account with a bcrypt-hashed password', async () => {
    const cookie = sessionFor(); // email is simply not seeded -> "free"
    prisma.user.create.mockResolvedValueOnce(publicUser({ role: 'ORGANIZER' }));

    const res = await request(app).post(BASE).set('Cookie', cookie).send(validBody('ORGANIZER'));

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('ORGANIZER');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe('ORGANIZER');
    expect(data.passwordHash).not.toBe('longenough1');
  });

  it('creates an ADMIN account', async () => {
    const cookie = sessionFor();
    prisma.user.create.mockResolvedValueOnce(publicUser({ role: 'ADMIN' }));

    const res = await request(app).post(BASE).set('Cookie', cookie).send(validBody('ADMIN'));

    expect(res.status).toBe(201);
    expect(prisma.user.create.mock.calls[0][0].data.role).toBe('ADMIN');
  });

  it('rejects role ATTENDEE with 422 (self-registration only, FR-01)', async () => {
    const res = await request(app).post(BASE).set('Cookie', sessionFor()).send(validBody('ATTENDEE'));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_ROLE');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email with 409', async () => {
    const cookie = sessionFor();
    seedUser({ id: 'existing', email: 'new.organizer@example.com' });

    const res = await request(app).post(BASE).set('Cookie', cookie).send(validBody());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a weak password with 422', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ ...validBody(), password: 'short1' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('WEAK_PASSWORD');
  });

  it('rejects an invalid email with 422', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ ...validBody(), email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_EMAIL');
  });
});

// ---------------------------------------------------------------- activate / deactivate

describe('POST /admin/users/:id/activate and /deactivate (FR-18)', () => {
  it('activates a user', async () => {
    const cookie = sessionFor();
    seedUser(targetUser({ isActive: false }));
    prisma.user.update.mockResolvedValueOnce(publicUser({ isActive: true }));

    const res = await request(app).post(`${BASE}/${TARGET_ID}/activate`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user.isActive).toBe(true);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ isActive: true });
  });

  it('deactivates a different, non-last-admin user', async () => {
    const cookie = sessionFor();
    seedUser(targetUser({ role: 'ORGANIZER' }));
    prisma.user.update.mockResolvedValueOnce(publicUser({ role: 'ORGANIZER', isActive: false }));

    const res = await request(app).post(`${BASE}/${TARGET_ID}/deactivate`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.user.isActive).toBe(false);
    // target is not an ADMIN, so the last-admin count is never even queried
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('refuses to deactivate yourself with 409', async () => {
    const cookie = sessionFor(); // registers `admin` under ADMIN_ID

    const res = await request(app).post(`${BASE}/${ADMIN_ID}/deactivate`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('reactivates a different, currently-inactive admin with no self/last-admin guard', async () => {
    // Activation is never self- or last-admin-guarded (only deactivation is) - demonstrated
    // with a DIFFERENT admin, since a self-deactivated admin's session would already be
    // rejected by requireAuth (ACCOUNT_INACTIVE) before reaching this route at all.
    const cookie = sessionFor();
    seedUser({ ...admin, id: OTHER_ADMIN_ID, isActive: false });
    prisma.user.update.mockResolvedValueOnce({ ...admin, id: OTHER_ADMIN_ID, isActive: true });

    const res = await request(app).post(`${BASE}/${OTHER_ADMIN_ID}/activate`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('refuses to deactivate the last active admin with 409', async () => {
    const cookie = sessionFor(); // acting admin: ADMIN_ID
    seedUser({ ...admin, id: OTHER_ADMIN_ID }); // target: a DIFFERENT admin
    prisma.user.count.mockResolvedValueOnce(1); // only one active admin left: the target

    const res = await request(app).post(`${BASE}/${OTHER_ADMIN_ID}/deactivate`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LAST_ADMIN_PROTECTED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows deactivating an admin when another active admin remains', async () => {
    const cookie = sessionFor();
    seedUser({ ...admin, id: OTHER_ADMIN_ID });
    prisma.user.count.mockResolvedValueOnce(2);
    prisma.user.update.mockResolvedValueOnce({ ...admin, id: OTHER_ADMIN_ID, isActive: false });

    const res = await request(app).post(`${BASE}/${OTHER_ADMIN_ID}/deactivate`).set('Cookie', cookie);

    expect(res.status).toBe(200);
  });

  it('returns 404 for an unknown user', async () => {
    // TARGET_ID is simply never seeded
    const res = await request(app).post(`${BASE}/${TARGET_ID}/deactivate`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });
});

// ---------------------------------------------------------------- role change

describe('POST /admin/users/:id/role (FR-18)', () => {
  it('promotes an ATTENDEE to ORGANIZER', async () => {
    const cookie = sessionFor();
    seedUser(targetUser({ role: 'ATTENDEE' }));
    prisma.user.update.mockResolvedValueOnce(publicUser({ role: 'ORGANIZER' }));

    const res = await request(app)
      .post(`${BASE}/${TARGET_ID}/role`)
      .set('Cookie', cookie)
      .send({ role: 'ORGANIZER' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('ORGANIZER');
    expect(prisma.user.count).not.toHaveBeenCalled(); // not demoting an admin
  });

  it('refuses to demote yourself with 409', async () => {
    const cookie = sessionFor();

    const res = await request(app)
      .post(`${BASE}/${ADMIN_ID}/role`)
      .set('Cookie', cookie)
      .send({ role: 'ORGANIZER' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to demote the last active admin with 409', async () => {
    const cookie = sessionFor();
    seedUser({ ...admin, id: OTHER_ADMIN_ID });
    prisma.user.count.mockResolvedValueOnce(1);

    const res = await request(app)
      .post(`${BASE}/${OTHER_ADMIN_ID}/role`)
      .set('Cookie', cookie)
      .send({ role: 'ORGANIZER' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LAST_ADMIN_PROTECTED');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('allows promoting an ORGANIZER to ADMIN without the last-admin check', async () => {
    const cookie = sessionFor();
    seedUser(targetUser({ role: 'ORGANIZER' }));
    prisma.user.update.mockResolvedValueOnce(publicUser({ role: 'ADMIN' }));

    const res = await request(app)
      .post(`${BASE}/${TARGET_ID}/role`)
      .set('Cookie', cookie)
      .send({ role: 'ADMIN' });

    expect(res.status).toBe(200);
    expect(prisma.user.count).not.toHaveBeenCalled();
  });

  it('rejects an invalid role with 422', async () => {
    const cookie = sessionFor();
    const res = await request(app)
      .post(`${BASE}/${TARGET_ID}/role`)
      .set('Cookie', cookie)
      .send({ role: 'SUPERUSER' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_ROLE');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-22 delete

describe('DELETE /admin/users/:id (FR-22)', () => {
  it('permanently deletes a user with no events, registrations or feedback', async () => {
    const cookie = sessionFor();
    seedUser(targetUser());
    prisma.event.count.mockResolvedValueOnce(0);
    prisma.registration.count.mockResolvedValueOnce(0);
    prisma.feedback.count.mockResolvedValueOnce(0);
    prisma.user.delete.mockResolvedValueOnce({});

    const res = await request(app).delete(`${BASE}/${TARGET_ID}`).set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
    expect(prisma.user.delete.mock.calls[0][0]).toEqual({ where: { id: TARGET_ID } });
  });

  it('refuses with 409 USER_HAS_DATA when the user organized events', async () => {
    const cookie = sessionFor();
    seedUser(targetUser({ role: 'ORGANIZER' }));
    prisma.event.count.mockResolvedValueOnce(2);
    prisma.registration.count.mockResolvedValueOnce(0);
    prisma.feedback.count.mockResolvedValueOnce(0);

    const res = await request(app).delete(`${BASE}/${TARGET_ID}`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_HAS_DATA');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses with 409 USER_HAS_DATA when the user has registrations', async () => {
    const cookie = sessionFor();
    seedUser(targetUser());
    prisma.event.count.mockResolvedValueOnce(0);
    prisma.registration.count.mockResolvedValueOnce(1);
    prisma.feedback.count.mockResolvedValueOnce(0);

    const res = await request(app).delete(`${BASE}/${TARGET_ID}`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_HAS_DATA');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete yourself with 409', async () => {
    const cookie = sessionFor();

    const res = await request(app).delete(`${BASE}/${ADMIN_ID}`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANNOT_MODIFY_SELF');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete the last active admin with 409', async () => {
    const cookie = sessionFor();
    seedUser({ ...admin, id: OTHER_ADMIN_ID });
    prisma.user.count.mockResolvedValueOnce(1);

    const res = await request(app).delete(`${BASE}/${OTHER_ADMIN_ID}`).set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LAST_ADMIN_PROTECTED');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown user', async () => {
    const cookie = sessionFor();
    const res = await request(app).delete(`${BASE}/${TARGET_ID}`).set('Cookie', cookie);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('returns 404 for a malformed id, calling findUnique only for the session', async () => {
    const cookie = sessionFor();
    const res = await request(app).delete(`${BASE}/nope`).set('Cookie', cookie);
    expect(res.status).toBe(404);
    // one call: requireAuth's session lookup. The malformed id never reaches the service.
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });
});
