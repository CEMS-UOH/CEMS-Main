// The public shapes of events and bookings for FR-03..FR-09.
// Every attendee query selects through these, so a column added to the schema later
// (e.g. an organizer's email) can never leak by accident. See API.md for the JSON contract.

const VENUE_SELECT = { id: true, name: true, building: true, location: true };
const CATEGORY_SELECT = { id: true, name: true };

// Only CONFIRMED bookings hold a seat - a cancelled booking frees it again.
const SEATS_TAKEN = { _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } } };

const EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  status: true,
  imageUrl: true,
  category: { select: CATEGORY_SELECT },
  venue: { select: VENUE_SELECT },
  // Never the organizer's email - attendees only need to know who runs the event.
  organizer: { select: { id: true, fullName: true } },
  ...SEATS_TAKEN,
};

const EVENT_DETAILS_SELECT = { ...EVENT_SELECT, attachments: true };

const BOOKING_SELECT = {
  id: true,
  status: true,
  qrCode: true,
  checkedInAt: true,
  createdAt: true,
  event: {
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      imageUrl: true,
      category: { select: CATEGORY_SELECT },
      venue: { select: VENUE_SELECT },
    },
  },
};

/** Replaces Prisma's `_count` with the seat numbers the UI actually shows. */
function toPublicEvent(event) {
  const { _count, ...rest } = event;
  const seatsTaken = _count.registrations;
  const seatsLeft = Math.max(0, event.capacity - seatsTaken);
  return { ...rest, seatsTaken, seatsLeft, isFull: seatsLeft === 0 };
}

/** A cancelled booking no longer carries a usable QR code; `canCancel` drives the UI button. */
function toPublicBooking(booking, now = new Date()) {
  const confirmed = booking.status === 'CONFIRMED';
  return {
    ...booking,
    qrCode: confirmed ? booking.qrCode : null,
    canCancel: confirmed && booking.event.startsAt > now,
  };
}

module.exports = {
  EVENT_SELECT,
  EVENT_DETAILS_SELECT,
  BOOKING_SELECT,
  toPublicEvent,
  toPublicBooking,
};
