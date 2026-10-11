// FR-14: who is registered for the organizer's own event.
// OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { ATTENDEE_SELECT, toPublicAttendee } = require('./shapes');

const NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');

async function listEventAttendees({ organizerId, eventId, status, page, limit }) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true },
  });
  if (!event || event.organizerId !== organizerId) throw NOT_FOUND();

  const where = { eventId, ...(status ? { status } : {}) };
  const [attendees, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      select: ATTENDEE_SELECT,
      orderBy: [{ createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.registration.count({ where }),
  ]);

  return {
    attendees: attendees.map(toPublicAttendee),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = { listEventAttendees };
