// Event ratings: an attendee rates an event after it ends (POST /api/attendee/events/:id/feedback)
// and the organizer reads them (GET /api/organizer/events/:id/feedback).
// Prisma is mocked - same pattern as health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findUnique: jest.fn() },
  registration: { findUnique: jest.fn() },
  feedback: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const RATE = `/api/attendee/events/${EVENT_ID}/feedback`;
const READ = `/api/organizer/events/${EVENT_ID}/feedback`;

const attendee = {
  id: 'user-1',
  email: 'sara@example.com',
  fullName: 'Sara',
  role: 'ATTENDEE',
  isActive: true,
  createdAt: new Date(),
};
const organizer = { ...attendee, id: 'organizer-1', fullName: 'Omar', role: 'ORGANIZER' };

const sessionFor = (user = attendee) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

const endedEvent = (overrides = {}) => ({
  status: 'APPROVED',
  endsAt: new Date(Date.now() - 3600e3),
  ...overrides,
});

beforeEach(() => jest.resetAllMocks());

describe('POST /api/attendee/events/:id/feedback', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).post(RATE).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it.each(['ORGANIZER', 'ADMIN'])('refuses an %s with 403', async (role) => {
    const res = await request(app)
      .post(RATE)
      .set('Cookie', sessionFor({ ...attendee, role }))
      .send({ rating: 5 });
    expect(res.status).toBe(403);
  });

  it('saves a rating with a trimmed comment', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(endedEvent());
    prisma.registration.findUnique.mockResolvedValueOnce({ status: 'CONFIRMED' });
    prisma.feedback.create.mockResolvedValueOnce({
      id: 'f-1',
      rating: 4,
      comment: 'Great workshop',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post(RATE)
      .set('Cookie', sessionFor())
      .send({ rating: 4, comment: '  Great workshop  ' });

    expect(res.status).toBe(201);
    expect(res.body.data.feedback.rating).toBe(4);
    expect(prisma.feedback.create.mock.calls[0][0].data).toEqual({
      eventId: EVENT_ID,
      userId: 'user-1',
      rating: 4,
      comment: 'Great workshop',
    });
    expect(prisma.registration.findUnique.mock.calls[0][0].where).toEqual({
      eventId_userId: { eventId: EVENT_ID, userId: 'user-1' },
    });
  });

  it('stores a blank comment as no comment', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(endedEvent());
    prisma.registration.findUnique.mockResolvedValueOnce({ status: 'CONFIRMED' });
    prisma.feedback.create.mockResolvedValueOnce({ id: 'f-1', rating: 5, comment: null, createdAt: new Date() });

    await request(app).post(RATE).set('Cookie', sessionFor()).send({ rating: 5, comment: '   ' });

    expect(prisma.feedback.create.mock.calls[0][0].data.comment).toBeNull();
  });

  it.each([
    ['before the event ends', endedEvent({ endsAt: new Date(Date.now() + 3600e3) }), { status: 'CONFIRMED' }],
    ['without a booking', endedEvent(), null],
    ['with a cancelled booking', endedEvent(), { status: 'CANCELLED' }],
  ])('refuses %s with 409 FEEDBACK_NOT_OPEN', async (_label, event, booking) => {
    prisma.event.findUnique.mockResolvedValueOnce(event);
    prisma.registration.findUnique.mockResolvedValueOnce(booking);

    const res = await request(app).post(RATE).set('Cookie', sessionFor()).send({ rating: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FEEDBACK_NOT_OPEN');
    expect(prisma.feedback.create).not.toHaveBeenCalled();
  });

  it('refuses a second rating with 409 ALREADY_REVIEWED', async () => {
    prisma.event.findUnique.mockResolvedValueOnce(endedEvent());
    prisma.registration.findUnique.mockResolvedValueOnce({ status: 'CONFIRMED' });
    prisma.feedback.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));

    const res = await request(app).post(RATE).set('Cookie', sessionFor()).send({ rating: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_REVIEWED');
  });

  it.each([null, { status: 'PENDING', endsAt: new Date() }])(
    'returns 404 for a missing or unapproved event (%p)',
    async (event) => {
      prisma.event.findUnique.mockResolvedValueOnce(event);
      const res = await request(app).post(RATE).set('Cookie', sessionFor()).send({ rating: 3 });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    }
  );

  it.each([undefined, 0, 6, 3.5, '4'])('rejects rating %p with 422 INVALID_RATING', async (rating) => {
    const res = await request(app).post(RATE).set('Cookie', sessionFor()).send({ rating });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_RATING');
    expect(prisma.event.findUnique).not.toHaveBeenCalled();
  });

  it.each([42, 'x'.repeat(1001)])('rejects comment %p with 422 INVALID_COMMENT', async (comment) => {
    const res = await request(app).post(RATE).set('Cookie', sessionFor()).send({ rating: 4, comment });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_COMMENT');
  });
});

describe('GET /api/organizer/events/:id/feedback', () => {
  it('returns the summary and the comments of the organizer’s own event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ organizerId: 'organizer-1' });
    prisma.feedback.findMany.mockResolvedValueOnce([
      { id: 'f-1', rating: 5, comment: 'Loved it', createdAt: new Date(), user: { fullName: 'Sara' } },
    ]);
    prisma.feedback.count.mockResolvedValueOnce(3);
    prisma.feedback.groupBy.mockResolvedValueOnce([
      { rating: 5, _count: { _all: 2 } },
      { rating: 3, _count: { _all: 1 } },
    ]);

    const res = await request(app).get(READ).set('Cookie', sessionFor(organizer));

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({
      count: 3,
      average: 4.3,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 },
    });
    expect(res.body.data.feedback[0].user).toEqual({ fullName: 'Sara' });
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('gives a null average when nobody has rated yet', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ organizerId: 'organizer-1' });
    prisma.feedback.findMany.mockResolvedValueOnce([]);
    prisma.feedback.count.mockResolvedValueOnce(0);
    prisma.feedback.groupBy.mockResolvedValueOnce([]);

    const res = await request(app).get(READ).set('Cookie', sessionFor(organizer));

    expect(res.body.data.summary.average).toBeNull();
    expect(res.body.data.summary.count).toBe(0);
  });

  it('returns 404 for another organizer’s event', async () => {
    prisma.event.findUnique.mockResolvedValueOnce({ organizerId: 'organizer-2' });
    const res = await request(app).get(READ).set('Cookie', sessionFor(organizer));
    expect(res.status).toBe(404);
    expect(prisma.feedback.findMany).not.toHaveBeenCalled();
  });

  it('refuses an attendee with 403', async () => {
    const res = await request(app).get(READ).set('Cookie', sessionFor());
    expect(res.status).toBe(403);
  });

  it('rejects bad paging with 422', async () => {
    const res = await request(app).get(`${READ}?limit=500`).set('Cookie', sessionFor(organizer));
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_PAGINATION');
  });
});
