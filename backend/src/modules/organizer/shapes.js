// The public shapes of events and attendee rows for FR-10..FR-16.
// Every organizer query selects through these, so a column added to the schema later cannot
// leak by accident. See API.md for the JSON contract.

const VENUE_SELECT = { id: true, name: true, building: true, location: true, capacity: true };
const CATEGORY_SELECT = { id: true, name: true, description: true };

// Only CONFIRMED registrations hold a seat - a cancelled one frees it again.
const SEATS_TAKEN = { _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } } };

// The organizer sees their own event in every status (PENDING/APPROVED/REJECTED/CANCELLED),
// unlike the attendee API which only ever returns APPROVED ones.
const EVENT_SELECT = {
  id: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  capacity: true,
  status: true,
  imageUrl: true,
  attachments: true,
  createdAt: true,
  updatedAt: true,
  category: { select: CATEGORY_SELECT },
  venue: { select: VENUE_SELECT },
  ...SEATS_TAKEN,
};

// FR-14: who is registered for the organizer's own event. Includes contact details - the
// organizer genuinely needs these to run the event (reach attendees, plan logistics) - but
// never the attendee's qrCode, which is that attendee's own ticket secret.
const ATTENDEE_SELECT = {
  id: true,
  status: true,
  checkedInAt: true,
  createdAt: true,
  user: { select: { id: true, fullName: true, email: true } },
};

/** Replaces Prisma's `_count` with seat numbers, and adds UI hints for edit/delete buttons. */
function toPublicEvent(event, now = new Date()) {
  const { _count, ...rest } = event;
  const seatsTaken = _count.registrations;
  const seatsLeft = Math.max(0, event.capacity - seatsTaken);
  const notStarted = event.startsAt > now;
  return {
    ...rest,
    seatsTaken,
    seatsLeft,
    isFull: seatsLeft === 0,
    canEdit: notStarted && ['PENDING', 'APPROVED'].includes(event.status),
    canDelete: notStarted && seatsTaken === 0,
  };
}

function toPublicAttendee(registration) {
  return registration;
}

module.exports = {
  VENUE_SELECT,
  CATEGORY_SELECT,
  EVENT_SELECT,
  ATTENDEE_SELECT,
  toPublicEvent,
  toPublicAttendee,
};
