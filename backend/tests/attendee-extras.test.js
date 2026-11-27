// Waitlist, favorites, attendance certificates and event reminders. Prisma is mocked - same
// pattern as health.test.js; $transaction runs its callback against the same mock.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findUnique: jest.fn() },
  registration: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  waitlistEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  favorite: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
  notification: { create: jest.fn(), createMany: jest.fn() },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');
const { promoteFromWaitlist } = require('../src/modules/attendee/waitlist.service');
const { runReminders } = require('../src/modules/attendee/reminders.service');

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const REG_ID = '44444444-4444-4444-8444-444444444444';
const inDays = (n) => new Date(Date.now() + n * 864e5);

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

beforeEach(() => {
  jest.resetAllMocks();
  prisma.$transaction.mockImplementation((arg) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  prisma.$queryRaw.mockResolvedValue([{ id: EVENT_ID }]);
});

// ---------------------------------------------------------------- waitlist

describe('POST /api/attendee/events/:id/waitlist', () => {
  const join = () => request(app).post(`/api/attendee/events/${EVENT_ID}/waitlist`).set('Cookie', sessionFor());
  const fullEvent = { capacity: 10, status: 'APPROVED', startsAt: inDays(3) };

  it('puts the attendee in line for a full event and says where', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(fullEvent);
    prisma.registration.findUnique.mockResolvedValueOnce(null);
    prisma.registration.count.mockResolvedValueOnce(10);
    prisma.waitlistEntry.create.mockResolvedValueOnce({ eventId: EVENT_ID, createdAt: new Date() });
    prisma.waitlistEntry.count.mockResolvedValueOnce(2); // two joined earlier

    const res = await join();

    expect(res.status).toBe(201);
    expect(res.body.data.waitlist.position).toBe(3);
    expect(prisma.$queryRaw).toHaveBeenCalled(); // under the event lock
  });

  it('says to book instead while seats remain', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(fullEvent);
    prisma.registration.findUnique.mockResolvedValueOnce(null);
    prisma.registration.count.mockResolvedValueOnce(9);

    const res = await join();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_FULL');
    expect(prisma.waitlistEntry.create).not.toHaveBeenCalled();
  });

  it('refuses someone who already holds a seat', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(fullEvent);
    prisma.registration.findUnique.mockResolvedValueOnce({ status: 'CONFIRMED' });
    const res = await join();
    expect(res.body.error.code).toBe('ALREADY_BOOKED');
  });

  it('refuses joining twice', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(fullEvent);
    prisma.registration.findUnique.mockResolvedValueOnce(null);
    prisma.registration.count.mockResolvedValueOnce(10);
    prisma.waitlistEntry.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    const res = await join();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_WAITLISTED');
  });

  it('refuses a started event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ ...fullEvent, startsAt: inDays(-1) });
    const res = await join();
    expect(res.body.error.code).toBe('BOOKING_CLOSED');
  });

  it('is for Attendees only', async () => {
    const res = await request(app)
      .post(`/api/attendee/events/${EVENT_ID}/waitlist`)
      .set('Cookie', sessionFor({ ...attendee, role: 'ORGANIZER' }));
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/attendee/events/:id/waitlist', () => {
  it('takes the attendee out of the line', async () => {
    prisma.waitlistEntry.deleteMany.mockResolvedValueOnce({ count: 1 });
    const res = await request(app).delete(`/api/attendee/events/${EVENT_ID}/waitlist`).set('Cookie', sessionFor());
    expect(res.status).toBe(200);
    expect(prisma.waitlistEntry.deleteMany.mock.calls[0][0].where).toEqual({ eventId: EVENT_ID, userId: 'user-1' });
  });

  it('answers 404 when they were not in line', async () => {
    prisma.waitlistEntry.deleteMany.mockResolvedValueOnce({ count: 0 });
    const res = await request(app).delete(`/api/attendee/events/${EVENT_ID}/waitlist`).set('Cookie', sessionFor());
    expect(res.body.error.code).toBe('NOT_ON_WAITLIST');
  });
});

describe('promoteFromWaitlist', () => {
  const openEvent = { id: EVENT_ID, title: 'AI Workshop', capacity: 10, status: 'APPROVED', startsAt: inDays(2) };

  it('gives each free seat to the earliest person waiting, with a fresh ticket and a notification', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent);
    prisma.registration.count.mockResolvedValueOnce(8); // two seats free
    prisma.waitlistEntry.findMany.mockResolvedValueOnce([
      { id: 'w1', userId: 'first' },
      { id: 'w2', userId: 'second' },
    ]);
    prisma.registration.findUnique.mockResolvedValueOnce({ id: 'old-reg' }).mockResolvedValueOnce(null);

    const promoted = await promoteFromWaitlist(prisma, EVENT_ID);

    expect(promoted).toBe(2);
    expect(prisma.waitlistEntry.findMany.mock.calls[0][0]).toMatchObject({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 2,
    });
    // A cancelled booking row is reused with a new QR code; a new person gets a new row.
    expect(prisma.registration.update.mock.calls[0][0].data).toMatchObject({ status: 'CONFIRMED', checkedInAt: null });
    expect(prisma.registration.update.mock.calls[0][0].data.qrCode).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(prisma.registration.create.mock.calls[0][0].data).toMatchObject({ eventId: EVENT_ID, userId: 'second' });
    expect(prisma.waitlistEntry.delete).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create.mock.calls.map((c) => c[0].data.type)).toEqual(['WAITLIST_PROMOTED', 'WAITLIST_PROMOTED']);
  });

  it('does nothing when no seat is free', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent);
    prisma.registration.count.mockResolvedValueOnce(10);
    expect(await promoteFromWaitlist(prisma, EVENT_ID)).toBe(0);
    expect(prisma.waitlistEntry.findMany).not.toHaveBeenCalled();
  });

  it('does nothing once the event has started', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ ...openEvent, startsAt: inDays(-1) });
    expect(await promoteFromWaitlist(prisma, EVENT_ID)).toBe(0);
  });
});

describe('cancelling hands the seat to the waitlist', () => {
  it('runs the promotion inside the cancel transaction', async () => {
    prisma.registration.findUnique
      .mockResolvedValueOnce({ id: REG_ID, userId: 'user-1', status: 'CONFIRMED', checkedInAt: null, eventId: EVENT_ID, event: { startsAt: inDays(3) } })
      .mockResolvedValueOnce({ id: 'old', }) // promotion: the waiting person's old row
      .mockResolvedValueOnce({
        id: REG_ID,
        status: 'CANCELLED',
        qrCode: 'x',
        checkedInAt: null,
        createdAt: new Date(),
        event: { id: EVENT_ID, title: 'AI', startsAt: inDays(3), endsAt: inDays(3), status: 'APPROVED', imageUrl: null, category: { id: 'c', name: 'c' }, venue: null },
      });
    prisma.registration.updateMany.mockResolvedValueOnce({ count: 1 });
    prisma.event.findUnique.mockResolvedValueOnce({ id: EVENT_ID, title: 'AI', capacity: 10, status: 'APPROVED', startsAt: inDays(3) });
    prisma.registration.count.mockResolvedValueOnce(9);
    prisma.waitlistEntry.findMany.mockResolvedValueOnce([{ id: 'w1', userId: 'next' }]);

    const res = await request(app).post(`/api/attendee/bookings/${REG_ID}/cancel`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.booking.status).toBe('CANCELLED');
    expect(prisma.notification.create.mock.calls[0][0].data).toMatchObject({ userId: 'next', type: 'WAITLIST_PROMOTED' });
  });
});

// ---------------------------------------------------------------- favorites

describe('favorites', () => {
  it('lists saved, published events', async () => {
    prisma.favorite.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date(),
        event: { id: EVENT_ID, title: 'AI', description: 'x', startsAt: inDays(2), endsAt: inDays(2), capacity: 5, status: 'APPROVED', imageUrl: null, category: { id: 'c', name: 'c' }, venue: null, organizer: { id: 'o', fullName: 'O' }, _count: { registrations: 1 } },
      },
    ]);
    const res = await request(app).get('/api/attendee/favorites').set('Cookie', sessionFor());
    expect(res.status).toBe(200);
    expect(res.body.data.events[0]).toMatchObject({ id: EVENT_ID, seatsLeft: 4 });
    expect(prisma.favorite.findMany.mock.calls[0][0].where).toEqual({ userId: 'user-1', event: { status: 'APPROVED' } });
  });

  it('saves an event, and saving it again is fine', async () => {
    prisma.event.findUnique.mockResolvedValue({ status: 'APPROVED' });
    prisma.favorite.create.mockResolvedValueOnce({}).mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    const first = await request(app).put(`/api/attendee/favorites/${EVENT_ID}`).set('Cookie', sessionFor());
    const second = await request(app).put(`/api/attendee/favorites/${EVENT_ID}`).set('Cookie', sessionFor());
    expect(first.body.data).toEqual({ saved: true });
    expect(second.body.data).toEqual({ saved: true });
  });

  it('refuses an unpublished event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ status: 'PENDING' });
    const res = await request(app).put(`/api/attendee/favorites/${EVENT_ID}`).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
  });

  it('un-saves, even when not saved', async () => {
    prisma.favorite.deleteMany.mockResolvedValueOnce({ count: 0 });
    const res = await request(app).delete(`/api/attendee/favorites/${EVENT_ID}`).set('Cookie', sessionFor());
    expect(res.body.data).toEqual({ saved: false });
  });

  it('needs a session', async () => {
    const res = await request(app).get('/api/attendee/favorites');
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------- certificates

describe('GET /api/certificates/:id (public)', () => {
  const booking = (overrides = {}) => ({
    id: REG_ID,
    status: 'CONFIRMED',
    checkedInAt: new Date('2026-11-01T15:05:00Z'),
    user: { fullName: 'Sara Ahmed' },
    event: {
      title: 'AI Workshop',
      status: 'APPROVED',
      startsAt: new Date('2026-11-01T15:00:00Z'),
      endsAt: new Date('2026-11-01T17:00:00Z'),
      category: { name: 'Workshop' },
      venue: { name: 'Hall A' },
      organizer: { fullName: 'Omar', organization: 'Tech Club' },
    },
    ...overrides,
  });

  it('shows the certificate of someone checked in, with no session needed', async () => {
    prisma.registration.findUnique.mockResolvedValueOnce(booking());
    const res = await request(app).get(`/api/certificates/${REG_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.certificate).toMatchObject({
      id: REG_ID,
      attendeeName: 'Sara Ahmed',
      eventTitle: 'AI Workshop',
      issuedBy: 'Tech Club',
      venue: 'Hall A',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/qrCode|email/);
  });

  it.each([
    ['nobody attended', booking({ checkedInAt: null })],
    ['the booking was cancelled', booking({ status: 'CANCELLED' })],
    ['the event is no longer published', booking({ event: { ...booking().event, status: 'CANCELLED' } })],
    ['no such booking', null],
  ])('answers 404 when %s', async (_label, row) => {
    prisma.registration.findUnique.mockResolvedValueOnce(row);
    const res = await request(app).get(`/api/certificates/${REG_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('CERTIFICATE_NOT_FOUND');
  });

  it('answers 404 for a malformed id without touching the database', async () => {
    const res = await request(app).get('/api/certificates/not-an-id');
    expect(res.status).toBe(404);
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- reminders

describe('runReminders', () => {
  it('sends the hour reminder (and skips the day one), then the day reminders', async () => {
    const now = new Date('2026-11-24T12:00:00Z');
    const soon = new Date('2026-11-24T12:40:00Z');
    const tomorrow = new Date('2026-11-25T10:00:00Z');
    prisma.registration.findMany
      .mockResolvedValueOnce([{ id: 'r1', userId: 'u1', event: { title: 'Soon', startsAt: soon } }])
      .mockResolvedValueOnce([{ id: 'r2', userId: 'u2', event: { title: 'Tomorrow', startsAt: tomorrow } }]);
    prisma.registration.updateMany.mockResolvedValue({ count: 1 });
    prisma.notification.createMany.mockResolvedValue({ count: 1 });

    const sent = await runReminders(now);

    expect(sent).toEqual({ hour: 1, day: 1 });
    const [hourQuery, dayQuery] = prisma.registration.findMany.mock.calls.map((c) => c[0].where);
    expect(hourQuery.hourReminderSentAt).toBeNull();
    expect(hourQuery.event.startsAt).toEqual({ gt: now, lte: new Date('2026-11-24T13:00:00Z') });
    expect(dayQuery.dayReminderSentAt).toBeNull();
    // The hour reminder marks both, so a late "tomorrow" reminder never follows it.
    expect(Object.keys(prisma.registration.updateMany.mock.calls[0][0].data).sort()).toEqual(['dayReminderSentAt', 'hourReminderSentAt']);
    const notes = prisma.notification.createMany.mock.calls[0][0].data;
    expect(notes[0]).toMatchObject({ userId: 'u1', type: 'EVENT_REMINDER', title: 'Soon', body: soon.toISOString() });
  });

  it('does nothing when nothing is due', async () => {
    prisma.registration.findMany.mockResolvedValue([]);
    expect(await runReminders()).toEqual({ hour: 0, day: 0 });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
