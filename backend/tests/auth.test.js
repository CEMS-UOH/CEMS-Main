// FR-01 (registration) and FR-02 (login). Prisma is mocked - same pattern as
// health.test.js - so these run with no database.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn(), create: jest.fn() },
  $queryRaw: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');
const requireRole = require('../src/middleware/requireRole');

const BASE = '/api/attendee/auth';

const attendee = {
  id: 'user-1',
  email: 'sara@example.com',
  fullName: 'Sara Ahmed',
  role: 'ATTENDEE',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

const withPassword = (plain, overrides = {}) => ({
  ...attendee,
  passwordHash: bcrypt.hashSync(plain, 4),
  ...overrides,
});

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------- FR-01 register

describe('POST /register (FR-01)', () => {
  it('creates an ATTENDEE and never returns the password hash', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null); // email is free
    prisma.user.create.mockResolvedValueOnce(attendee);

    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'Sara@Example.com', password: 'longenough1', fullName: '  Sara Ahmed  ' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('sara@example.com');
    expect(res.body.data.user.role).toBe('ATTENDEE');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    // email lowercased, name trimmed, and the stored hash is not the raw password
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.email).toBe('sara@example.com');
    expect(data.fullName).toBe('Sara Ahmed');
    expect(data.role).toBe('ATTENDEE');
    expect(data.passwordHash).not.toBe('longenough1');
    expect(bcrypt.compareSync('longenough1', data.passwordHash)).toBe(true);
  });

  it('ignores a role sent by the client and always creates an ATTENDEE', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce(attendee);

    const res = await request(app).post(`${BASE}/register`).send({
      email: 'sneaky@example.com',
      password: 'longenough1',
      fullName: 'Sneaky',
      role: 'ADMIN',
    });

    expect(res.status).toBe(201);
    expect(prisma.user.create.mock.calls[0][0].data.role).toBe('ATTENDEE');
  });

  it('rejects a duplicate email with 409', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'sara@example.com', password: 'longenough1', fullName: 'Sara' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each([
    ['missing @', 'not-an-email'],
    ['no domain dot', 'someone@localhost'],
    ['whitespace only', '   '],
    ['not a string', 12345],
  ])('rejects an invalid email format (%s) with 422', async (_label, email) => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email, password: 'longenough1', fullName: 'Sara' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_EMAIL');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a password under 8 characters with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'sara@example.com', password: 'short7!', fullName: 'Sara' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('WEAK_PASSWORD');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects a missing full name with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: 'sara@example.com', password: 'longenough1', fullName: '   ' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_NAME');
  });
});

// ---------------------------------------------------------------- FR-02 login

describe('POST /login (FR-02)', () => {
  it('logs in and sets a hardened httpOnly session cookie', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'Sara@Example.com', password: 'longenough1' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('sara@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith(`${COOKIE_NAME}=`));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).not.toMatch(/Secure/i); // NODE_ENV=test, so no HTTPS requirement
  });

  it('rejects a wrong password with the generic 401 and no cookie', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'sara@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('gives the SAME error for an unknown email as for a wrong password', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));
    const wrongPassword = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'sara@example.com', password: 'wrong-password' });

    prisma.user.findUnique.mockResolvedValueOnce(null);
    const unknownEmail = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'nobody@example.com', password: 'longenough1' });

    expect(unknownEmail.status).toBe(wrongPassword.status);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('rejects an inactive user with 403 even when the password is right', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1', { isActive: false }));

    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'sara@example.com', password: 'longenough1' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    expect(res.headers['set-cookie']).toBeUndefined();
  });
});

// ---------------------------------------------------------------- /me and /logout

describe('GET /me', () => {
  it('returns the current user when a valid cookie is sent', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(attendee);
    const token = signToken(attendee);

    const res = await request(app).get(`${BASE}/me`).set('Cookie', `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe('user-1');
    expect(res.body.data.user.role).toBe('ATTENDEE');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
  });

  it('returns 401 with no cookie', async () => {
    const res = await request(app).get(`${BASE}/me`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 for a tampered cookie', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Cookie', `${COOKIE_NAME}=not.a.real.token`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 403 when the user was deactivated after the token was issued', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ ...attendee, isActive: false });
    const token = signToken(attendee);

    const res = await request(app).get(`${BASE}/me`).set('Cookie', `${COOKIE_NAME}=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });
});

describe('POST /logout', () => {
  it('clears the session cookie', async () => {
    const res = await request(app).post(`${BASE}/logout`);

    expect(res.status).toBe(200);
    expect(res.body.data.loggedOut).toBe(true);

    const cookie = res.headers['set-cookie'].find((c) => c.startsWith(`${COOKIE_NAME}=`));
    expect(cookie).toMatch(new RegExp(`^${COOKIE_NAME}=;`)); // value emptied
    expect(cookie).toMatch(/Expires=Thu, 01 Jan 1970/i);
  });
});

// ---------------------------------------------------------------- requireRole

describe('requireRole', () => {
  const run = (guard, user) => {
    const req = user ? { user } : {};
    const next = jest.fn();
    const res = {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    guard(req, res, next);
    return { res, next };
  };

  it('denies a wrong role with 403', () => {
    const { res, next } = run(requireRole('ADMIN'), { ...attendee, role: 'ATTENDEE' });

    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a matching role', () => {
    const { res, next } = run(requireRole('ADMIN', 'ORGANIZER'), {
      ...attendee,
      role: 'ORGANIZER',
    });

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('returns 401 when requireAuth did not run first', () => {
    const { res, next } = run(requireRole('ADMIN'), null);

    expect(res.statusCode).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    expect(next).not.toHaveBeenCalled();
  });
});
