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
const loginThrottle = require('../src/lib/loginThrottle');

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

beforeEach(() => {
  jest.clearAllMocks();
  loginThrottle.reset();
});

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

  it.each(['ADMIN', 'SUPERUSER', '', 42, null])(
    'refuses to self-register with role %p - only ATTENDEE or ORGANIZER',
    async (role) => {
      const res = await request(app).post(`${BASE}/register`).send({
        email: 'sneaky@example.com',
        password: 'longenough1',
        fullName: 'Sneaky',
        role,
        phone: '0512345678',
      });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_ROLE');
      expect(prisma.user.create).not.toHaveBeenCalled();
    }
  );

  it('stores no contact details for an ATTENDEE, even if some are sent', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce(attendee);

    const res = await request(app).post(`${BASE}/register`).send({
      email: 'sara@example.com',
      password: 'longenough1',
      fullName: 'Sara',
      role: 'ATTENDEE',
      phone: '0512345678',
      organization: 'Robotics Club',
    });

    expect(res.status).toBe(201);
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe('ATTENDEE');
    expect(data.phone).toBeNull();
    expect(data.organization).toBeNull();
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

// ------------------------------------------------- FR-01 register as an Organizer

describe('POST /register as an Organizer', () => {
  const organizerUser = {
    ...attendee,
    id: 'user-2',
    email: 'omar@example.com',
    fullName: 'Omar',
    role: 'ORGANIZER',
    phone: '+966512345678',
    organization: 'Robotics Club',
  };
  const body = (overrides = {}) => ({
    email: 'omar@example.com',
    password: 'longenough1',
    fullName: 'Omar',
    role: 'ORGANIZER',
    phone: '+966 51 234-5678',
    organization: '  Robotics Club  ',
    ...overrides,
  });

  it('creates an active ORGANIZER with a cleaned-up phone and trimmed organization', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce(organizerUser);

    const res = await request(app).post(`${BASE}/register`).send(body());

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('ORGANIZER');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);

    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.role).toBe('ORGANIZER');
    expect(data.phone).toBe('+966512345678'); // spaces and dashes removed
    expect(data.organization).toBe('Robotics Club');
    // No pending state: the account is usable at once. The gate is event approval.
    expect(data.isActive).toBeUndefined();
  });

  it('accepts a phone typed in Arabic digits and stores it as 0-9', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce(organizerUser);

    const res = await request(app)
      .post(`${BASE}/register`)
      .send(body({ phone: '٠٥١٢٣٤٥٦٧٨' }));

    expect(res.status).toBe(201);
    expect(prisma.user.create.mock.calls[0][0].data.phone).toBe('0512345678');
  });

  it('treats the organization as optional', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({ ...organizerUser, organization: null });

    const { organization, ...withoutOrganization } = body();
    const res = await request(app).post(`${BASE}/register`).send(withoutOrganization);

    expect(res.status).toBe(201);
    expect(prisma.user.create.mock.calls[0][0].data.organization).toBeNull();
  });

  it.each([
    ['missing', undefined],
    ['empty', '   '],
    ['too short', '12345'],
    ['too long', '1234567890123456'],
    ['letters', '05abc45678'],
    ['not a string', 512345678],
  ])('requires a valid phone number (%s) with 422', async (_label, phone) => {
    const res = await request(app).post(`${BASE}/register`).send(body({ phone }));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_PHONE');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each([
    ['over 120 characters', 'x'.repeat(121)],
    ['not a string', 12345],
  ])('rejects a bad organization (%s) with 422', async (_label, organization) => {
    const res = await request(app).post(`${BASE}/register`).send(body({ organization }));

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_ORGANIZATION');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('still rejects a duplicate email with 409', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing' });

    const res = await request(app).post(`${BASE}/register`).send(body());

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
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

// ---------------------------------------------------------------- login throttle

describe('POST /login - too many wrong passwords', () => {
  const tryLogin = (password, email = 'sara@example.com') =>
    request(app).post(`${BASE}/login`).send({ email, password });

  it(`locks the account after ${loginThrottle.MAX_FAILURES} wrong passwords, even for the right one`, async () => {
    for (let i = 0; i < loginThrottle.MAX_FAILURES; i++) {
      prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));
      const res = await tryLogin('wrong-password');
      expect(res.status).toBe(401);
    }

    const locked = await tryLogin('longenough1');

    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
    expect(locked.headers['set-cookie']).toBeUndefined();
    // Refused before the password is even looked at.
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(loginThrottle.MAX_FAILURES);
  });

  it('counts the email case-insensitively, so changing case does not reset the count', async () => {
    for (let i = 0; i < loginThrottle.MAX_FAILURES; i++) {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await tryLogin('wrong-password', i % 2 ? 'SARA@example.com' : 'sara@EXAMPLE.com');
    }
    const res = await tryLogin('anything', 'Sara@Example.com');
    expect(res.status).toBe(429);
  });

  it('only locks the account being guessed', async () => {
    for (let i = 0; i < loginThrottle.MAX_FAILURES; i++) {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      await tryLogin('wrong-password', 'victim@example.com');
    }
    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));

    const res = await tryLogin('longenough1');

    expect(res.status).toBe(200);
  });

  it('starts counting again after a successful login', async () => {
    for (let i = 0; i < loginThrottle.MAX_FAILURES - 1; i++) {
      prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));
      await tryLogin('wrong-password');
    }
    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));
    expect((await tryLogin('longenough1')).status).toBe(200);

    prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1'));
    expect((await tryLogin('wrong-password')).status).toBe(401); // not 429
  });

  it('does not count a disabled account with the right password as a guess', async () => {
    for (let i = 0; i < loginThrottle.MAX_FAILURES + 1; i++) {
      prisma.user.findUnique.mockResolvedValueOnce(withPassword('longenough1', { isActive: false }));
      const res = await tryLogin('longenough1');
      expect(res.status).toBe(403);
    }
  });
});

describe('loginThrottle', () => {
  it('lifts the lock by itself after the window', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < loginThrottle.MAX_FAILURES; i++) loginThrottle.recordFailure('a@x.com', t0);
    expect(loginThrottle.check('a@x.com', t0 + 1000).allowed).toBe(false);
    expect(loginThrottle.check('a@x.com', t0 + loginThrottle.WINDOW_MS + 1).allowed).toBe(true);
  });

  it('forgets old failures outside the window', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < loginThrottle.MAX_FAILURES - 1; i++) loginThrottle.recordFailure('b@x.com', t0);
    loginThrottle.recordFailure('b@x.com', t0 + loginThrottle.WINDOW_MS + 1);
    expect(loginThrottle.check('b@x.com', t0 + loginThrottle.WINDOW_MS + 2).allowed).toBe(true);
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
