// FR-14: list the registered attendees of the organizer's own event.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findUnique: jest.fn() },
  registration: { findMany: jest.fn(), count: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const ORGANIZER_ID = 'organizer-1';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const BASE = `/api/organizer/events/${EVENT_ID}/attendees`;

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

const attendeeRow = (overrides = {}) => ({
  id: 'reg-1',
  status: 'CONFIRMED',
  checkedInAt: null,
  createdAt: new Date(),
  user: { id: 'user-1', fullName: 'Sara Ahmed', email: 'sara@example.com' },
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe('GET /organizer/events/:id/attendees (FR-14)', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it('returns 403 for an ATTENDEE', async () => {
    const res = await request(app)
      .get(BASE)
      .set('Cookie', sessionFor({ ...organizer, role: 'ATTENDEE' }));
    expect(res.status).toBe(403);
  });

  it('lists attendees of the organizer’s own event, without their QR codes', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ organizerId: ORGANIZER_ID });
    prisma.registration.findMany.mockResolvedValueOnce([attendeeRow()]);
    prisma.registration.count.mockResolvedValueOnce(1);

    const res = await request(app).get(BASE).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(res.body.data.attendees).toHaveLength(1);
    expect(res.body.data.attendees[0].user.email).toBe('sara@example.com');
    expect(res.body.data.attendees[0].qrCode).toBeUndefined();
    expect(prisma.registration.findMany.mock.calls[0][0].where).toEqual({ eventId: EVENT_ID });
  });

  it('filters by status', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ organizerId: ORGANIZER_ID });
    prisma.registration.findMany.mockResolvedValueOnce([]);
    prisma.registration.count.mockResolvedValueOnce(0);

    const res = await request(app).get(`${BASE}?status=CANCELLED`).set('Cookie', sessionFor());

    expect(res.status).toBe(200);
    expect(prisma.registration.findMany.mock.calls[0][0].where).toEqual({
      eventId: EVENT_ID,
      status: 'CANCELLED',
    });
  });

  it('rejects an invalid status with 422', async () => {
    const res = await request(app).get(`${BASE}?status=X`).set('Cookie', sessionFor());
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_FILTER');
  });

  it('returns 404 for another organizer’s event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ organizerId: 'organizer-2' });
    const res = await request(app).get(BASE).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    expect(prisma.registration.findMany).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).get(BASE).set('Cookie', sessionFor());
    expect(res.status).toBe(404);
  });

  it('returns 404 for a malformed event id without touching the database', async () => {
    const res = await request(app)
      .get('/api/organizer/events/nope/attendees')
      .set('Cookie', sessionFor());
    expect(res.status).toBe(404);
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });
});
