// Saved events ("favorites"). OWNER: Role 2. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { EVENT_SELECT, toPublicEvent } = require('./shapes');

/** The caller's saved events that are still published, soonest first. */
async function list(userId) {
  const rows = await prisma.favorite.findMany({
    where: { userId, event: { status: 'APPROVED' } },
    select: { createdAt: true, event: { select: EVENT_SELECT } },
    orderBy: { event: { startsAt: 'asc' } },
  });
  return { events: rows.map((row) => ({ ...toPublicEvent(row.event), savedAt: row.createdAt })) };
}

/** Save an event. Saving it twice is not an error. */
async function add({ userId, eventId }) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { status: true } });
  if (!event || event.status !== 'APPROVED') throw new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
  try {
    await prisma.favorite.create({ data: { userId, eventId } });
  } catch (e) {
    if (e.code !== 'P2002') throw e; // already saved
  }
  return { saved: true };
}

/** Un-save an event. Removing one that is not saved is not an error either. */
async function remove({ userId, eventId }) {
  await prisma.favorite.deleteMany({ where: { userId, eventId } });
  return { saved: false };
}

module.exports = { list, add, remove };
