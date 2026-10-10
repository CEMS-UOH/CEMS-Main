// FR-05 (book + QR), FR-06 (confirmation notification), FR-07 (cancel), FR-08 (history).
// Prisma is mocked - same pattern as health.test.js - so these run with no database.
// $transaction runs its callback against the same mock, so the transaction body is exercised.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findUnique: jest.fn() },
  registration: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  notification: { create: jest.fn() },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/attendee/bookings';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const BOOKING_ID = '44444444-4444-4444-8444-444444444444';

const inDays = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const attendee = {
  id: 'user-1',
  email: 'sara@example.com',
  fullName: 'Sara Ahmed',
  role: 'ATTENDEE',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

/** requireAuth loads the user on every request - queue that lookup and return the cookie. */
const sessionFor = (user = attendee) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

const lockedEvent = (overrides = {}) => ({
  id: EVENT_ID,
  title: 'AI Workshop',
  startsAt: inDays(3),
  capacity: 50,
  status: 'APPROVED',
  ...overrides,
});

// What Prisma returns for BOOKING_SELECT.
const dbBooking = (overrides = {}) => ({
  id: BOOKING_ID,
  status: 'CONFIRMED',
  qrCode: 'qr-token',
  checkedInAt: null,
  createdAt: new Date(),
  event: {
    id: EVENT_ID,
    title: 'AI Workshop',
    startsAt: inDays(3),
    endsAt: inDays(3.1),
    status: 'APPROVED',
    imageUrl: null,
    category: { id: 'cat-1', name: 'Workshop' },
    venue: { id: 'venue-1', name: 'Main Hall', building: 'A', location: null },
  },
  ...overrides,
});

beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
});

// ---------------------------------------------------------------- auth guard

describe('bookings auth', () => {
  it.each([
    ['POST', BASE],
    ['GET', BASE],
    ['POST', `${BASE}/${BOOKING_ID}/cancel`],
  ])('%s %s returns 401 without a session', async (method, path) => {
    const res = await request(app)[method.toLowerCase()](path);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each(['ORGANIZER', 'ADMIN'])('returns 403 for an %s', async (role) => {
    const res = await request(app)
      .get(BASE)
      .set('Cookie', sessionFor({ ...attendee, role }));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(prisma.registration.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-05 + FR-06 book

describe('POST /bookings (FR-05, FR-06)', () => {
  const book = (body = { eventId: EVENT_ID }) =>
    request(app).post(BASE).set('Cookie', sessionFor()).send(body);

  const arrangeOpenEvent = ({ event = lockedEvent(), existing = null, taken = 0 } = {}) => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: EVENT_ID }]);
    prisma.event.findUnique.mockResolvedValueOnce(event);
    prisma.registration.findUnique.mockResolvedValueOnce(existing);
    prisma.registration.count.mockResolvedValueOnce(taken);
  };

  it('books a seat with a fresh random QR code and notifies the attendee', async () => {
    arrangeOpenEvent({ taken: 49 }); // the last seat
    prisma.registration.create.mockImplementationOnce(({ data }) =>
      Promise.resolve(dbBooking({ qrCode: data.qrCode }))
    );
    prisma.notification.create.mockResolvedValueOnce({});

    const res = await book();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const { booking } = res.body.data;
    expect(booking.status).toBe('CONFIRMED');
    expect(booking.qrCode).toMatch(/^[A-Za-z0-9_-]{32}$/); // 24 random bytes, base64url
    expect(booking.canCancel).toBe(true);

    // the user comes from the session, never the body
    const data = prisma.registration.create.mock.calls[0][0].data;
    expect(data).toEqual({ eventId: EVENT_ID, userId: 'user-1', qrCode: booking.qrCode });

    // FR-06: a confirmation for this user, inside the same transaction
    const notification = prisma.notification.create.mock.calls[0][0].data;
    expect(notification.userId).toBe('user-1');
    expect(notification.type).toBe('BOOKING_CONFIRMATION');
    expect(notification.title).toBe('AI Workshop');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('locks the event row before counting seats', async () => {
    arrangeOpenEvent();
    prisma.registration.create.mockResolvedValueOnce(dbBooking());
    prisma.notification.create.mockResolvedValueOnce({});

    await book();

    const sql = prisma.$queryRaw.mock.calls[0][0].join('?');
    expect(sql).toMatch(/FOR UPDATE/);
    expect(prisma.$queryRaw.mock.calls[0][1]).toBe(EVENT_ID);
  });

  it('generates a different QR code for every booking', async () => {
    const codes = [];
    for (let i = 0; i < 2; i += 1) {
      arrangeOpenEvent();
      prisma.registration.create.mockImplementationOnce(({ data }) => {
        codes.push(data.qrCode);
        return Promise.resolve(dbBooking({ qrCode: data.qrCode }));
      });
      prisma.notification.create.mockResolvedValueOnce({});
      await book();
    }
    expect(codes[0]).not.toBe(codes[1]);
  });

  it('ignores a userId sent in the body', async () => {
    arrangeOpenEvent();
    prisma.registration.create.mockResolvedValueOnce(dbBooking());
    prisma.notification.create.mockResolvedValueOnce({});

    await book({ eventId: EVENT_ID, userId: 'someone-else' });

    expect(prisma.registration.create.mock.calls[0][0].data.userId).toBe('user-1');
  });

  it('rejects a duplicate booking with 409 and creates nothing', async () => {
    arrangeOpenEvent({ existing: { id: BOOKING_ID, status: 'CONFIRMED' } });

    const res = await book();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_BOOKED');
    expect(prisma.registration.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('maps a unique-index race (P2002) to ALREADY_BOOKED', async () => {
    arrangeOpenEvent();
    prisma.registration.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));

    const res = await book();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_BOOKED');
  });

  it('rejects booking a full event with 409', async () => {
    arrangeOpenEvent({ event: lockedEvent({ capacity: 50 }), taken: 50 });

    const res = await book();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_FULL');
    expect(prisma.registration.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('counts only CONFIRMED bookings toward capacity', async () => {
    arrangeOpenEvent();
    prisma.registration.create.mockResolvedValueOnce(dbBooking());
    prisma.notification.create.mockResolvedValueOnce({});

    await book();

    expect(prisma.registration.count.mock.calls[0][0].where).toEqual({
      eventId: EVENT_ID,
      status: 'CONFIRMED',
    });
  });

  it('re-books after a cancellation by reusing the row with a NEW QR code', async () => {
    arrangeOpenEvent({ existing: { id: BOOKING_ID, status: 'CANCELLED' } });
    prisma.registration.update.mockImplementationOnce(({ data }) =>
      Promise.resolve(dbBooking({ qrCode: data.qrCode }))
    );
    prisma.notification.create.mockResolvedValueOnce({});

    const res = await book();

    expect(res.status).toBe(201);
    const { where, data } = prisma.registration.update.mock.calls[0][0];
    expect(where).toEqual({ id: BOOKING_ID });
    expect(data.status).toBe('CONFIRMED');
    expect(data.checkedInAt).toBeNull();
    expect(data.qrCode).toBe(res.body.data.booking.qrCode);
    expect(prisma.registration.create).not.toHaveBeenCalled();
  });

  it('rejects an event that has already started with 409', async () => {
    arrangeOpenEvent({ event: lockedEvent({ startsAt: inDays(-0.01) }) });

    const res = await book();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_CLOSED');
    expect(prisma.registration.create).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'REJECTED', 'CANCELLED'])('treats a %s event as not found', async (status) => {
    arrangeOpenEvent({ event: lockedEvent({ status }) });

    const res = await book();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('returns 404 when the event does not exist', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);

    const res = await book();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['missing', {}],
    ['not an id', { eventId: 'abc' }],
    ['not a string', { eventId: 42 }],
  ])('returns 404 for an eventId that is %s, without a transaction', async (_label, body) => {
    const res = await book(body);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-08 history

describe('GET /bookings (FR-08)', () => {
  it("returns all of the caller's bookings, hiding QR codes of cancelled ones", async () => {
    prisma.registration.findMany.mockResolvedValueOnce([
      dbBooking(),
      dbBooking({ id: 'b-2', status: 'CANCELLED', qrCode: 'old-token' }),
      dbBooking({ id: 'b-3', event: { ...dbBooking().event, startsAt: inDays(-10) } }),
    ]);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    const [upcoming, cancelled, past] = res.body.data.bookings;
    expect(upcoming.qrCode).toBe('qr-token');
    expect(upcoming.canCancel).toBe(true);
    expect(cancelled.qrCode).toBeNull();
    expect(cancelled.canCancel).toBe(false);
    expect(past.canCancel).toBe(false);

    const args = prisma.registration.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 'user-1' });
    expect(args.orderBy[0]).toEqual({ event: { startsAt: 'desc' } });
  });

  it('filters by status', async () => {
    prisma.registration.findMany.mockResolvedValueOnce([]);

    const res = await request(app).get(`${BASE}?status=CANCELLED`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(prisma.registration.findMany.mock.calls[0][0].where).toEqual({
      userId: 'user-1',
      status: 'CANCELLED',
    });
  });

  it('rejects an unknown status with 422', async () => {
    const res = await request(app).get(`${BASE}?status=DELETED`).set('Cookie', sessionFor());

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_FILTER');
    expect(prisma.registration.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- FR-07 cancel

describe('POST /bookings/:id/cancel (FR-07)', () => {
  const cancel = (id = BOOKING_ID) =>
    request(app).post(`${BASE}/${id}/cancel`).set('Cookie', sessionFor());

  const owned = (overrides = {}) => ({
    id: BOOKING_ID,
    userId: 'user-1',
    status: 'CONFIRMED',
    event: { startsAt: inDays(3) },
    ...overrides,
  });

  it('cancels the caller’s own booking before the event', async () => {
    prisma.registration.findUnique.mockResolvedValueOnce(owned());
    prisma.registration.update.mockResolvedValueOnce(dbBooking({ status: 'CANCELLED' }));

    const res = await cancel();

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('CANCELLED');
    expect(res.body.data.booking.qrCode).toBeNull();
    expect(res.body.data.booking.canCancel).toBe(false);
    expect(prisma.registration.update.mock.calls[0][0]).toMatchObject({
      where: { id: BOOKING_ID },
      data: { status: 'CANCELLED' },
    });
  });

  it("hides someone else's booking as 404 and changes nothing", async () => {
    prisma.registration.findUnique.mockResolvedValueOnce(owned({ userId: 'user-2' }));

    const res = await cancel();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOOKING_NOT_FOUND');
    expect(prisma.registration.update).not.toHaveBeenCalled();
  });

  it('refuses after the event has started', async () => {
    prisma.registration.findUnique.mockResolvedValueOnce(owned({ event: { startsAt: inDays(-0.01) } }));

    const res = await cancel();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CANCELLATION_CLOSED');
    expect(prisma.registration.update).not.toHaveBeenCalled();
  });

  it('refuses a booking that is already cancelled', async () => {
    prisma.registration.findUnique.mockResolvedValueOnce(owned({ status: 'CANCELLED' }));

    const res = await cancel();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_CANCELLED');
  });

  it('returns 404 for an unknown booking', async () => {
    prisma.registration.findUnique.mockResolvedValueOnce(null);

    const res = await cancel();

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOOKING_NOT_FOUND');
  });

  it('returns 404 for a malformed id without touching the database', async () => {
    const res = await cancel('nope');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOOKING_NOT_FOUND');
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
  });
});
