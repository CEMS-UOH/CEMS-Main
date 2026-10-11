// Seat booking for FR-05 (book + QR), FR-06 (confirmation notification),
// FR-07 (cancel) and FR-08 (booking history).
// OWNER: Role 2. Input is already validated by the controller.
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { BOOKING_SELECT, toPublicBooking } = require('./shapes');

// The QR code holds only this random token. It is unguessable (192 bits), so a code cannot be
// forged for someone else's seat, and it carries no personal data if a ticket is photographed.
// The organizer's check-in looks the booking up by it (Registration.qrCode is unique).
const newQrToken = () => crypto.randomBytes(24).toString('base64url');

const NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');

/**
 * FR-05 + FR-06: book one seat and notify the attendee, all in one transaction.
 *
 * Capacity is the hard part: two attendees booking the last seat at the same moment must not
 * both succeed. Locking the event row (SELECT ... FOR UPDATE) makes concurrent bookings for
 * the same event wait for each other, so the seat count below is always current. Bookings
 * for different events never block each other.
 */
async function book({ userId, eventId }) {
  try {
    return await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`SELECT id FROM "events" WHERE id = ${eventId} FOR UPDATE`;
      if (locked.length === 0) throw NOT_FOUND();

      const event = await tx.event.findUnique({
        where: { id: eventId },
        // organizerId is needed for the FR-15 capacity-full notification below.
        select: {
          id: true,
          title: true,
          startsAt: true,
          capacity: true,
          status: true,
          organizerId: true,
        },
      });
      if (!event || event.status !== 'APPROVED') throw NOT_FOUND();
      if (event.startsAt <= new Date()) {
        throw new HttpError(409, 'This event has already started', 'BOOKING_CLOSED');
      }

      const existing = await tx.registration.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { id: true, status: true },
      });
      if (existing && existing.status === 'CONFIRMED') {
        throw new HttpError(409, 'You have already booked this event', 'ALREADY_BOOKED');
      }

      const seatsTaken = await tx.registration.count({ where: { eventId, status: 'CONFIRMED' } });
      if (seatsTaken >= event.capacity) {
        throw new HttpError(409, 'This event is fully booked', 'EVENT_FULL');
      }

      // (eventId, userId) is unique, so booking again after a cancellation reuses the old row
      // with a fresh QR code - the old, cancelled code must never work again.
      const qrCode = newQrToken();
      const booking = existing
        ? await tx.registration.update({
            where: { id: existing.id },
            data: { status: 'CONFIRMED', qrCode, checkedInAt: null },
            select: BOOKING_SELECT,
          })
        : await tx.registration.create({
            data: { eventId, userId, qrCode },
            select: BOOKING_SELECT,
          });

      // FR-06. The UI shows this by `type` in the reader's language; title/body are the
      // stored fallback text.
      await tx.notification.create({
        data: {
          userId,
          type: 'BOOKING_CONFIRMATION',
          title: event.title,
          body: `Your seat is booked for "${event.title}" on ${event.startsAt.toISOString()}.`,
        },
      });

      // FR-15: tell the organizer once, the moment this booking fills the last seat.
      // Notification has no eventId column, so the event id is embedded in `body` and used
      // as the idempotency key - a second booking (after a cancellation frees a seat and a
      // new one re-fills it) must not notify the organizer twice for the same event. The
      // event row is still locked (FOR UPDATE) at this point, so two bookings racing for the
      // last seat cannot both pass this check.
      const seatsTakenNow = seatsTaken + 1;
      if (seatsTakenNow === event.capacity) {
        const alreadyNotified = await tx.notification.findFirst({
          where: {
            userId: event.organizerId,
            type: 'CAPACITY_FULL',
            body: { contains: event.id },
          },
          select: { id: true },
        });
        if (!alreadyNotified) {
          await tx.notification.create({
            data: {
              userId: event.organizerId,
              type: 'CAPACITY_FULL',
              title: event.title,
              body: `Event "${event.title}" (id: ${event.id}) has reached full capacity.`,
            },
          });
        }
      }

      return toPublicBooking(booking);
    });
  } catch (e) {
    // Belt and braces: the row lock already serialises bookings, but if two requests from the
    // same attendee still race to create the row, the unique index rejects the second one.
    if (e.code === 'P2002') {
      throw new HttpError(409, 'You have already booked this event', 'ALREADY_BOOKED');
    }
    throw e;
  }
}

/** FR-08: every booking the attendee ever made, confirmed or cancelled, newest event first. */
async function listBookings({ userId, status }) {
  const bookings = await prisma.registration.findMany({
    where: { userId, ...(status ? { status } : {}) },
    select: BOOKING_SELECT,
    orderBy: [{ event: { startsAt: 'desc' } }, { createdAt: 'desc' }],
  });
  const now = new Date();
  return bookings.map((b) => toPublicBooking(b, now));
}

/**
 * FR-07: cancel the caller's own booking, only before the event starts.
 * Someone else's booking is reported as not found, so ids cannot be probed.
 */
async function cancel({ userId, bookingId }) {
  const booking = await prisma.registration.findUnique({
    where: { id: bookingId },
    select: { id: true, userId: true, status: true, event: { select: { startsAt: true } } },
  });

  if (!booking || booking.userId !== userId) {
    throw new HttpError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }
  if (booking.status === 'CANCELLED') {
    throw new HttpError(409, 'This booking is already cancelled', 'ALREADY_CANCELLED');
  }
  if (booking.event.startsAt <= new Date()) {
    throw new HttpError(409, 'A booking cannot be cancelled after the event starts', 'CANCELLATION_CLOSED');
  }

  const updated = await prisma.registration.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
    select: BOOKING_SELECT,
  });
  return toPublicBooking(updated);
}

module.exports = { book, listBookings, cancel };
