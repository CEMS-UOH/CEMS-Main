// Waitlist for full events. OWNER: Role 2. Input is already validated by the controller.
//
// An attendee can join the waitlist of an approved, not-yet-started event only while it is
// full. Whenever a seat frees up - someone cancels, or the organizer raises the capacity -
// promoteFromWaitlist() hands it to the earliest person waiting, inside the same transaction
// that freed it: the seat can never be taken twice, and nobody has to watch the page.
const crypto = require('crypto');
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { EVENT_SELECT, toPublicEvent } = require('./shapes');

const newQrToken = () => crypto.randomBytes(24).toString('base64url');
const NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
// Same reason as BOOKING_TX_OPTIONS in bookings.service.js.
const TX_OPTIONS = { timeout: 30000, maxWait: 10000 };

/** 1-based place in the queue: how many joined before this entry, plus one. */
async function positionOf(db, { eventId, createdAt }) {
  return 1 + (await db.waitlistEntry.count({ where: { eventId, createdAt: { lt: createdAt } } }));
}

/**
 * Give free seats of `eventId` to the people waiting, earliest first. Must run inside a
 * transaction that already holds the event row lock (SELECT ... FOR UPDATE), like booking
 * and cancelling do, so the seat count cannot change underneath it.
 * Returns how many people got a seat.
 */
async function promoteFromWaitlist(tx, eventId, now = new Date()) {
  const event = await tx.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, capacity: true, status: true, startsAt: true },
  });
  // Nothing to hand out for an event that is not open for booking any more.
  if (!event || event.status !== 'APPROVED' || event.startsAt <= now) return 0;

  const taken = await tx.registration.count({ where: { eventId, status: 'CONFIRMED' } });
  const free = event.capacity - taken;
  if (free <= 0) return 0;

  const next = await tx.waitlistEntry.findMany({
    where: { eventId, user: { isActive: true } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: free,
    select: { id: true, userId: true },
  });

  for (const entry of next) {
    const existing = await tx.registration.findUnique({
      where: { eventId_userId: { eventId, userId: entry.userId } },
      select: { id: true },
    });
    // Same rule as booking again after a cancellation: reuse the row, with a fresh QR code.
    if (existing) {
      await tx.registration.update({
        where: { id: existing.id },
        data: { status: 'CONFIRMED', qrCode: newQrToken(), checkedInAt: null, dayReminderSentAt: null, hourReminderSentAt: null },
      });
    } else {
      await tx.registration.create({ data: { eventId, userId: entry.userId, qrCode: newQrToken() } });
    }
    await tx.waitlistEntry.delete({ where: { id: entry.id } });
    await tx.notification.create({
      data: {
        userId: entry.userId,
        type: 'WAITLIST_PROMOTED',
        title: event.title,
        body: `A seat freed up at "${event.title}" and it is now yours. Your ticket is in My bookings.`,
      },
    });
  }
  return next.length;
}

/** Join the waitlist of a full event. */
async function join({ userId, eventId }, now = new Date()) {
  try {
    return await prisma.$transaction(async (tx) => {
      // The same lock as booking: "is it full?" must not change while we decide.
      const locked = await tx.$queryRaw`SELECT id FROM "events" WHERE id = ${eventId} FOR UPDATE`;
      if (locked.length === 0) throw NOT_FOUND();

      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { capacity: true, status: true, startsAt: true },
      });
      if (!event || event.status !== 'APPROVED') throw NOT_FOUND();
      if (event.startsAt <= now) {
        throw new HttpError(409, 'This event has already started', 'BOOKING_CLOSED');
      }

      const booking = await tx.registration.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      });
      if (booking?.status === 'CONFIRMED') {
        throw new HttpError(409, 'You already have a seat at this event', 'ALREADY_BOOKED');
      }

      const taken = await tx.registration.count({ where: { eventId, status: 'CONFIRMED' } });
      if (taken < event.capacity) {
        throw new HttpError(409, 'Seats are still available - book one instead', 'EVENT_NOT_FULL');
      }

      const entry = await tx.waitlistEntry.create({
        data: { eventId, userId },
        select: { eventId: true, createdAt: true },
      });
      return { waitlist: { eventId, joinedAt: entry.createdAt, position: await positionOf(tx, entry) } };
    }, TX_OPTIONS);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new HttpError(409, 'You are already on the waitlist', 'ALREADY_WAITLISTED');
    }
    throw e;
  }
}

/** Leave the waitlist. */
async function leave({ userId, eventId }) {
  const { count } = await prisma.waitlistEntry.deleteMany({ where: { eventId, userId } });
  if (count === 0) throw new HttpError(404, 'You are not on this waitlist', 'NOT_ON_WAITLIST');
  return { left: true };
}

/** The caller's place on every waitlist they are on, soonest event first. */
async function listMine(userId) {
  const entries = await prisma.waitlistEntry.findMany({
    where: { userId, event: { status: 'APPROVED' } },
    select: { eventId: true, createdAt: true, event: { select: EVENT_SELECT } },
    orderBy: { event: { startsAt: 'asc' } },
  });
  const waitlist = await Promise.all(
    entries.map(async (entry) => ({
      eventId: entry.eventId,
      joinedAt: entry.createdAt,
      position: await positionOf(prisma, entry),
      event: toPublicEvent(entry.event),
    }))
  );
  return { waitlist };
}

module.exports = { promoteFromWaitlist, join, leave, listMine };
