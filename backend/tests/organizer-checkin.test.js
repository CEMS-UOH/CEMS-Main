// FR-14: check-in at the door, by the ticket's QR code or by picking the name from the list.
// Prisma is mocked - same pattern as health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findUnique: jest.fn() },
  registration: { findUnique: jest.fn(), updateMany: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const ORGANIZER_ID = 'organizer-1';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_EVENT_ID = '99999999-9999-4999-8999-999999999999';
const REG_ID = '44444444-4444-4444-8444-444444444444';
const CODE = 'Qm9va2luZ1Rva2VuX0FCQ0RFRkdISUpLTE1O';
const BY_CODE = `/api/organizer/events/${EVENT_ID}/check-in`;
const BY_ID = `/api/organizer/events/${EVENT_ID}/attendees/${REG_ID}/check-in`;

const organizer = {
  id: ORGANIZER_ID,
  email: 'omar@example.com',
  fullName: 'Omar the Organizer',
  role: 'ORGANIZER',
  isActive: true,
  createdAt: new Date(),
};

const sessionFor = (user = organizer) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

const inAnHour = () => new Date(Date.now() + 3600e3);
const openEvent = (overrides = {}) => ({
  organizerId: ORGANIZER_ID,
  status: 'APPROVED',
  endsAt: inAnHour(),
  ...overrides,
});
const booking = (overrides = {}) => ({
  id: REG_ID,
  eventId: EVENT_ID,
  status: 'CONFIRMED',
  checkedInAt: null,
  ...overrides,
});
const attendeeRow = (overrides = {}) => ({
  id: REG_ID,
  status: 'CONFIRMED',
  checkedInAt: new Date(),
  createdAt: new Date(),
  user: { id: 'user-1', fullName: 'Sara Ahmed', email: 'sara@example.com' },
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe('check-in auth', () => {
  it.each([BY_CODE, BY_ID])('POST %s returns 401 without a session', async (path) => {
    const res = await request(app).post(path).send({ code: CODE });
    expect(res.status).toBe(401);
  });

  it.each(['ATTENDEE', 'ADMIN'])('refuses an %s with 403', async (role) => {
    const res = await request(app)
      .post(BY_CODE)
      .set('Cookie', sessionFor({ ...organizer, role }))
      .send({ code: CODE });
    expect(res.status).toBe(403);
    expect(prisma.registration.updateMany).not.toHaveBeenCalled();
  });
});

describe('POST /organizer/events/:id/check-in (scan)', () => {
  it('checks in a confirmed ticket for this event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique
      .mockResolvedValueOnce(booking())
      .mockResolvedValueOnce(attendeeRow());
    prisma.registration.updateMany.mockResolvedValueOnce({ count: 1 });

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: ` ${CODE} ` });

    expect(res.status).toBe(200);
    expect(res.body.data.alreadyCheckedIn).toBe(false);
    expect(res.body.data.attendee.user.fullName).toBe('Sara Ahmed');
    expect(res.body.data.attendee.qrCode).toBeUndefined();
    expect(prisma.registration.findUnique.mock.calls[0][0].where).toEqual({ qrCode: CODE });
    expect(prisma.registration.updateMany.mock.calls[0][0].where).toEqual({
      id: REG_ID,
      status: 'CONFIRMED',
      checkedInAt: null,
    });
  });

  it('answers 200 with alreadyCheckedIn for a second scan, without writing again', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique
      .mockResolvedValueOnce(booking({ checkedInAt: new Date() }))
      .mockResolvedValueOnce(attendeeRow());

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.status).toBe(200);
    expect(res.body.data.alreadyCheckedIn).toBe(true);
    expect(prisma.registration.updateMany).not.toHaveBeenCalled();
  });

  it('reports a lost race (another scanner was first) as already checked in', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique
      .mockResolvedValueOnce(booking())
      .mockResolvedValueOnce(attendeeRow());
    prisma.registration.updateMany.mockResolvedValueOnce({ count: 0 });

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.body.data.alreadyCheckedIn).toBe(true);
  });

  it('says so when the ticket is for another event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique.mockResolvedValueOnce(booking({ eventId: OTHER_EVENT_ID }));

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TICKET_FOR_OTHER_EVENT');
    expect(prisma.registration.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a cancelled booking', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique.mockResolvedValueOnce(booking({ status: 'CANCELLED' }));

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TICKET_CANCELLED');
  });

  it('returns 404 TICKET_NOT_FOUND for an unknown code', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique.mockResolvedValueOnce(null);

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it.each([
    ['a PENDING event', { status: 'PENDING' }],
    ['an ended event', { endsAt: new Date(Date.now() - 1000) }],
  ])('refuses check-in for %s with 409 CHECK_IN_CLOSED', async (_label, overrides) => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent(overrides));

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CHECK_IN_CLOSED');
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for another organizer’s event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent({ organizerId: 'organizer-2' }));

    const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code: CODE });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
  });

  it.each([undefined, '', 'short', 'has spaces in it but long enough', 'x'.repeat(65), 42])(
    'rejects code %p with 422 INVALID_CODE',
    async (code) => {
      const res = await request(app).post(BY_CODE).set('Cookie', sessionFor()).send({ code });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_CODE');
      expect(prisma.event.findUnique).not.toHaveBeenCalled();
    }
  );
});

describe('POST /organizer/events/:id/attendees/:registrationId/check-in (from the list)', () => {
  it('checks in the picked booking', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique
      .mockResolvedValueOnce(booking())
      .mockResolvedValueOnce(attendeeRow());
    prisma.registration.updateMany.mockResolvedValueOnce({ count: 1 });

    const res = await request(app).post(BY_ID).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.alreadyCheckedIn).toBe(false);
    expect(prisma.registration.findUnique.mock.calls[0][0].where).toEqual({ id: REG_ID });
  });

  it('treats a booking of another event as not found', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(openEvent());
    prisma.registration.findUnique.mockResolvedValueOnce(booking({ eventId: OTHER_EVENT_ID }));

    const res = await request(app).post(BY_ID).set('Cookie', sessionFor());

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
  });

  it('returns 404 for a malformed booking id without touching the database', async () => {
    const res = await request(app)
      .post(`/api/organizer/events/${EVENT_ID}/attendees/nope/check-in`)
      .set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });
});
