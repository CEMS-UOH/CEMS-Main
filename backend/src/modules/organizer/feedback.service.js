// Ratings attendees gave one of the organizer's own events: the summary and every comment.
// OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');

async function listEventFeedback({ organizerId, eventId, page, limit }) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  if (!event || event.organizerId !== organizerId) {
    throw new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  const where = { eventId };
  const [feedback, total, byRating] = await Promise.all([
    prisma.feedback.findMany({
      where,
      // The attendee's name only - an organizer reading comments has no need for more.
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.feedback.count({ where }),
    prisma.feedback.groupBy({ by: ['rating'], where, _count: { _all: true } }),
  ]);

  // How many gave each number of stars, 1..5 (zeros included, so a chart needs no gaps logic).
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const row of byRating) {
    distribution[row.rating] = row._count._all;
    sum += row.rating * row._count._all;
  }
  const count = Object.values(distribution).reduce((a, b) => a + b, 0);

  return {
    summary: {
      count,
      // One decimal, like "4.3". null when nobody has rated yet.
      average: count ? Math.round((sum / count) * 10) / 10 : null,
      distribution,
    },
    feedback,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { listEventFeedback };
