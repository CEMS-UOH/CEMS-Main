// Rating an event after it ends: 1..5 stars and an optional comment, once per attendee.
// OWNER: Role 2. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');

const FEEDBACK_SELECT = { id: true, rating: true, comment: true, createdAt: true };

/**
 * Open to an attendee who held a CONFIRMED seat, once the event has ended. A seat that was
 * cancelled, or an event still running, gives FEEDBACK_NOT_OPEN.
 */
async function createFeedback({ userId, eventId, rating, comment }) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true, endsAt: true },
  });
  // Same visibility as the rest of the attendee API: only approved events exist here.
  if (!event || event.status !== 'APPROVED') {
    throw new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
  }

  const booking = await prisma.registration.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { status: true },
  });
  if (!booking || booking.status !== 'CONFIRMED' || event.endsAt > new Date()) {
    throw new HttpError(
      409,
      'You can rate an event after it ends, if you held a seat',
      'FEEDBACK_NOT_OPEN'
    );
  }

  try {
    return await prisma.feedback.create({
      data: { eventId, userId, rating, comment },
      select: FEEDBACK_SELECT,
    });
  } catch (e) {
    // @@unique([eventId, userId]): a second rating, even one sent at the same moment.
    if (e.code === 'P2002') {
      throw new HttpError(409, 'You have already rated this event', 'ALREADY_REVIEWED');
    }
    throw e;
  }
}

module.exports = { createFeedback };
