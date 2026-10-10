// Event browsing for FR-03 (list), FR-04 (filter) and FR-09 (details).
// OWNER: Role 2. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { EVENT_SELECT, EVENT_DETAILS_SELECT, toPublicEvent } = require('./shapes');

/**
 * FR-03 + FR-04: APPROVED events that have not ended yet, soonest first.
 * `day` is { start, end } for the ?date= filter: an event matches if it overlaps that day,
 * so a two-day workshop shows up on both days.
 */
async function listEvents({ categoryId, venueId, day, page, limit }) {
  const now = new Date();
  const notEndedBefore = day && day.start > now ? day.start : now;

  const where = {
    status: 'APPROVED',
    endsAt: { gt: notEndedBefore },
    ...(day ? { startsAt: { lt: day.end } } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(venueId ? { venueId } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: EVENT_SELECT,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }], // id breaks ties so pages never overlap
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map(toPublicEvent),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * FR-09: one event. Anything not APPROVED (pending, rejected, cancelled) is reported as
 * not found, so attendees cannot read events that were never published.
 */
async function getEvent(id) {
  const event = await prisma.event.findUnique({ where: { id }, select: EVENT_DETAILS_SELECT });
  if (!event || event.status !== 'APPROVED') {
    throw new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }
  return toPublicEvent(event);
}

module.exports = { listEvents, getEvent };
