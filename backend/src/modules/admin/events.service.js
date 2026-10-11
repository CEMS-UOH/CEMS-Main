// FR-17 (approve/reject) and the event half of FR-22 (permanent delete).
// listEvents is NOT in the task's FR list, but is added for the same reason as the organizer
// module's list endpoint: FR-17 cannot be used at all if the admin has no way to find out
// which events are PENDING. See the PR description.
// OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { EVENT_SELECT, toPublicEvent } = require('./shapes');

const NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');

async function loadPendingEvent(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: EVENT_SELECT });
  if (!event) throw NOT_FOUND();
  if (event.status !== 'PENDING') {
    throw new HttpError(409, 'Only a PENDING event can be approved or rejected', 'EVENT_NOT_PENDING');
  }
  return event;
}

/** FR-17 */
async function approveEvent(eventId) {
  await loadPendingEvent(eventId);
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: 'APPROVED' },
    select: EVENT_SELECT,
  });
  return toPublicEvent(event);
}

/** FR-17 */
async function rejectEvent(eventId) {
  await loadPendingEvent(eventId);
  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: 'REJECTED' },
    select: EVENT_SELECT,
  });
  return toPublicEvent(event);
}

/**
 * FR-22: permanent delete of ANY event, any status, any owner. Unlike the organizer's own
 * FR-12 delete, admin override is not blocked by existing bookings - Registration.event and
 * Feedback.event both cascade, so they are removed along with the event.
 */
async function deleteEvent(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) throw NOT_FOUND();
  await prisma.event.delete({ where: { id: eventId } });
}

/** Not in the FR list - see the file header note. */
async function listEvents({ status, organizerId, page, limit }) {
  const where = { ...(status ? { status } : {}), ...(organizerId ? { organizerId } : {}) };
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: EVENT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
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

module.exports = { approveEvent, rejectEvent, deleteEvent, listEvents };
