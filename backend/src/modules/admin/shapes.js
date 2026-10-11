// The public shapes admin queries select through, for FR-17..FR-19, FR-21, FR-22.
// See API.md for the JSON contract.
const { PUBLIC_USER_FIELDS } = require('../../lib/userFields');

// Reused as-is: passwordHash is absent by construction, so it can never leak here either.
const USER_SELECT = PUBLIC_USER_FIELDS;

const VENUE_SELECT = { id: true, name: true, building: true, location: true, capacity: true };
const CATEGORY_SELECT = { id: true, name: true, description: true };

// Admin sees every event regardless of status, plus who organizes it (their own module-local
// concern - the attendee API deliberately never exposes an organizer's email, but admin
// oversight genuinely needs it).
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
  organizer: { select: { id: true, fullName: true, email: true } },
  category: { select: CATEGORY_SELECT },
  venue: { select: VENUE_SELECT },
  _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } },
};

function toPublicEvent(event) {
  const { _count, ...rest } = event;
  return { ...rest, confirmedBookings: _count.registrations };
}

function toPublicCategory(category) {
  const { _count, ...rest } = category;
  return _count ? { ...rest, eventCount: _count.events } : rest;
}

module.exports = {
  USER_SELECT,
  VENUE_SELECT,
  CATEGORY_SELECT,
  EVENT_SELECT,
  toPublicEvent,
  toPublicCategory,
};
