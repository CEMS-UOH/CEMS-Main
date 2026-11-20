// FR-14: check an attendee in at the door, by scanning the QR on their ticket or by picking
// their name from the attendee list. OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { ATTENDEE_SELECT, toPublicAttendee } = require('./shapes');

const EVENT_NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
const TICKET_NOT_FOUND = () => new HttpError(404, 'No booking matches this ticket', 'TICKET_NOT_FOUND');

/**
 * Check-in is open while the event is APPROVED and has not ended. It is allowed before the
 * start on purpose: doors usually open early, and a queue should not wait for the clock.
 */
async function loadOpenEvent({ organizerId, eventId }) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizerId: true, status: true, endsAt: true },
  });
  // Someone else's event is reported exactly like a missing one.
  if (!event || event.organizerId !== organizerId) throw EVENT_NOT_FOUND();
  if (event.status !== 'APPROVED' || event.endsAt <= new Date()) {
    throw new HttpError(409, 'Check-in is only open for an approved event that has not ended', 'CHECK_IN_CLOSED');
  }
}

/**
 * Marks the booking found by `where` (its QR token, or its id) as checked in.
 * Scanning the same ticket twice is not an error - the door needs to see "already in, at
 * 18:02", not a failure - so the answer says whether this was the first check-in.
 */
async function checkIn({ organizerId, eventId, where, byCode }) {
  await loadOpenEvent({ organizerId, eventId });

  const booking = await prisma.registration.findUnique({
    where,
    select: { id: true, eventId: true, status: true, checkedInAt: true },
  });
  if (!booking) throw TICKET_NOT_FOUND();
  if (booking.eventId !== eventId) {
    // A scanned ticket for another event is worth saying out loud at the door. A booking id
    // typed into this event's own list is simply "not found".
    if (!byCode) throw TICKET_NOT_FOUND();
    throw new HttpError(409, 'This ticket is for a different event', 'TICKET_FOR_OTHER_EVENT');
  }
  if (booking.status !== 'CONFIRMED') {
    throw new HttpError(409, 'This booking was cancelled', 'TICKET_CANCELLED');
  }

  // Conditional update: two scanners reading the same ticket at once check it in only once.
  const { count } = booking.checkedInAt
    ? { count: 0 }
    : await prisma.registration.updateMany({
        where: { id: booking.id, status: 'CONFIRMED', checkedInAt: null },
        data: { checkedInAt: new Date() },
      });

  const attendee = await prisma.registration.findUnique({
    where: { id: booking.id },
    select: ATTENDEE_SELECT,
  });
  return { attendee: toPublicAttendee(attendee), alreadyCheckedIn: count === 0 };
}

const checkInByCode = ({ organizerId, eventId, code }) =>
  checkIn({ organizerId, eventId, where: { qrCode: code }, byCode: true });

const checkInById = ({ organizerId, eventId, registrationId }) =>
  checkIn({ organizerId, eventId, where: { id: registrationId }, byCode: false });

module.exports = { checkInByCode, checkInById };
