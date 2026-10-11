// Organizer's own events: FR-10 (create), FR-11 (edit), FR-12 (delete), FR-13 (capacity rules
// shared by both), FR-16 (image/attachment URLs - validated in the controller, stored here).
//
// listOwnEvents/getOwnEvent are NOT in the task's FR list, but FR-11, FR-12 and FR-14 are
// unusable without some way for the organizer to discover their own event ids - see the PR
// description for this note.
//
// OWNER: Role 3. Input format (types, string lengths, URL shape) is already validated by the
// controller; this file enforces the rules that need the database: ownership, that the chosen
// venue/category actually exist, FR-13's capacity bounds, and the edit/delete timing windows.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { EVENT_SELECT, toPublicEvent } = require('./shapes');

const EDITABLE_FIELDS = [
  'title',
  'description',
  'startsAt',
  'endsAt',
  'capacity',
  'categoryId',
  'imageUrl',
  'attachments',
];

const NOT_FOUND = () => new HttpError(404, 'Event not found', 'EVENT_NOT_FOUND');
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/** FR-13. `venue` is null when the event has no venue chosen. */
function checkCapacity(capacity, venue, confirmedBookings) {
  if (venue && capacity > venue.capacity) {
    throw new HttpError(
      422,
      `Capacity cannot exceed the venue's capacity (${venue.capacity})`,
      'CAPACITY_EXCEEDS_VENUE'
    );
  }
  if (capacity < confirmedBookings) {
    throw new HttpError(
      422,
      `Capacity cannot be lower than the ${confirmedBookings} seat(s) already booked`,
      'CAPACITY_BELOW_BOOKED'
    );
  }
}

/** startsAt/endsAt must be well-ordered and in the future - shared by create and edit. */
function checkDates(startsAt, endsAt, now = new Date()) {
  if (startsAt <= now) {
    throw new HttpError(422, 'startsAt must be in the future', 'INVALID_DATES');
  }
  if (startsAt >= endsAt) {
    throw new HttpError(422, 'startsAt must be before endsAt', 'INVALID_DATES');
  }
}

async function loadCategory(categoryId) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new HttpError(422, 'Unknown category', 'INVALID_CATEGORY');
  return category;
}

/** `venueId` is optional - a falsy value means "no venue". */
async function loadVenue(venueId) {
  if (!venueId) return null;
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) throw new HttpError(422, 'Unknown venue', 'INVALID_VENUE');
  return venue;
}

/** FR-10: always PENDING, always organised by the session user - never from the client. */
async function createEvent({
  organizerId,
  title,
  description,
  startsAt,
  endsAt,
  capacity,
  venueId,
  categoryId,
  imageUrl,
  attachments,
}) {
  checkDates(startsAt, endsAt);
  await loadCategory(categoryId);
  const venue = await loadVenue(venueId);
  checkCapacity(capacity, venue, 0); // a brand new event has no bookings yet

  const event = await prisma.event.create({
    data: {
      title,
      description,
      startsAt,
      endsAt,
      capacity,
      venueId: venueId || null,
      categoryId,
      imageUrl: imageUrl || null,
      attachments: attachments || [],
      organizerId,
      status: 'PENDING',
    },
    select: EVENT_SELECT,
  });
  return toPublicEvent(event);
}

/**
 * FR-11: edit the organizer's own event. `changes` holds only the fields the client actually
 * sent (a partial update) - anything not present keeps its current value.
 * Someone else's event is reported as not found, same as the attendee module's pattern.
 */
async function editEvent(organizerId, eventId, changes) {
  const current = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ...EVENT_SELECT, organizerId: true },
  });
  if (!current || current.organizerId !== organizerId) throw NOT_FOUND();

  if (!['PENDING', 'APPROVED'].includes(current.status)) {
    throw new HttpError(409, 'This event can no longer be edited', 'EVENT_NOT_EDITABLE');
  }
  if (current.startsAt <= new Date()) {
    throw new HttpError(409, 'This event has already started', 'EVENT_ALREADY_STARTED');
  }

  const nextStartsAt = has(changes, 'startsAt') ? changes.startsAt : current.startsAt;
  const nextEndsAt = has(changes, 'endsAt') ? changes.endsAt : current.endsAt;
  checkDates(nextStartsAt, nextEndsAt);

  let venue = current.venue;
  if (has(changes, 'venueId')) venue = await loadVenue(changes.venueId);
  if (has(changes, 'categoryId')) await loadCategory(changes.categoryId);

  const nextCapacity = has(changes, 'capacity') ? changes.capacity : current.capacity;
  const confirmedBookings = await prisma.registration.count({
    where: { eventId, status: 'CONFIRMED' },
  });
  checkCapacity(nextCapacity, venue, confirmedBookings);

  const data = {};
  for (const key of EDITABLE_FIELDS) {
    if (has(changes, key)) data[key] = changes[key];
  }
  if (has(changes, 'venueId')) data.venueId = changes.venueId || null;

  const updated = await prisma.event.update({ where: { id: eventId }, data, select: EVENT_SELECT });
  return toPublicEvent(updated);
}

/** FR-12: only the organizer's own event, only before it starts, never with confirmed bookings. */
async function deleteEvent(organizerId, eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, startsAt: true },
  });
  if (!event || event.organizerId !== organizerId) throw NOT_FOUND();

  if (event.startsAt <= new Date()) {
    throw new HttpError(
      409,
      'An event that has already started cannot be deleted',
      'EVENT_ALREADY_STARTED'
    );
  }

  const confirmedBookings = await prisma.registration.count({
    where: { eventId, status: 'CONFIRMED' },
  });
  if (confirmedBookings > 0) {
    throw new HttpError(
      409,
      'This event has confirmed bookings and cannot be deleted',
      'EVENT_HAS_BOOKINGS'
    );
  }

  await prisma.event.delete({ where: { id: eventId } });
}

/** Not in the FR list - see the file header note. */
async function listOwnEvents({ organizerId, status, page, limit }) {
  const where = { organizerId, ...(status ? { status } : {}) };
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      select: EVENT_SELECT,
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.event.count({ where }),
  ]);
  return {
    events: events.map((e) => toPublicEvent(e)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Not in the FR list - see the file header note. */
async function getOwnEvent(organizerId, eventId) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { ...EVENT_SELECT, organizerId: true },
  });
  if (!event || event.organizerId !== organizerId) throw NOT_FOUND();
  const { organizerId: _drop, ...publicFields } = event;
  return toPublicEvent(publicFields);
}

module.exports = { createEvent, editEvent, deleteEvent, listOwnEvents, getOwnEvent };
