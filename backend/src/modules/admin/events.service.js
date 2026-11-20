// FR-17 (approve/reject) and the event half of FR-22 (permanent delete).
// listEvents is NOT in the task's FR list, but is added for the same reason as the organizer
// module's list endpoint: FR-17 cannot be used at all if the admin has no way to find out
// which events are PENDING. See the PR description.
// OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { EVENT_SELECT, toPublicEvent } = require('./shapes');

const NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');

const NOT_PENDING = () =>
  new HttpError(409, 'Only a PENDING event can be approved or rejected', 'EVENT_NOT_PENDING');

// Same reason as BOOKING_TX_OPTIONS in attendee/bookings.service.js: four round trips to a
// database far from the API can pass Prisma's 5 s default.
const DECISION_TX_OPTIONS = { timeout: 30000, maxWait: 10000 };

// What the organizer is told, by decision. The UI shows these by `type` in the reader's
// language; title is the event title and body is the stored English fallback.
const DECISIONS = {
  APPROVED: { type: 'EVENT_APPROVED', verb: 'approved' },
  REJECTED: { type: 'EVENT_REJECTED', verb: 'rejected' },
};

/**
 * FR-17: approve or reject a PENDING event, and tell its organizer in the same transaction.
 * The status change is conditional on the event still being PENDING, so two admins deciding
 * at the same moment cannot both succeed (and the organizer is never notified twice).
 */
async function decide(eventId, status) {
  const { type, verb } = DECISIONS[status];
  return prisma.$transaction(async (tx) => {
    const current = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, status: true, organizerId: true },
    });
    if (!current) throw NOT_FOUND();
    if (current.status !== 'PENDING') throw NOT_PENDING();

    const { count } = await tx.event.updateMany({
      where: { id: eventId, status: 'PENDING' },
      data: { status },
    });
    if (count === 0) throw NOT_PENDING();

    await tx.notification.create({
      data: {
        userId: current.organizerId,
        type,
        title: current.title,
        body: `Your event "${current.title}" (id: ${current.id}) was ${verb} by an admin.`,
      },
    });

    const event = await tx.event.findUnique({ where: { id: eventId }, select: EVENT_SELECT });
    return toPublicEvent(event);
  }, DECISION_TX_OPTIONS);
}

/** FR-17 */
const approveEvent = (eventId) => decide(eventId, 'APPROVED');

/** FR-17 */
const rejectEvent = (eventId) => decide(eventId, 'REJECTED');

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
