// HTTP layer for FR-05..FR-08. All request validation happens HERE (CLAUDE.md rule 5).
// requireAuth + requireRole('ATTENDEE') run first (bookings.routes.js), so req.user is set.
const { ok, fail } = require('../../lib/response');
const { isUuid } = require('./params');
const bookingsService = require('./bookings.service');

const BOOKING_STATUSES = ['CONFIRMED', 'CANCELLED'];

/** POST /api/attendee/bookings  { eventId } */
async function create(req, res, next) {
  const { eventId } = req.body || {};
  // Like GET /events/:id, a malformed id is simply an event that does not exist.
  if (!isUuid(eventId)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  try {
    // The user always comes from the session - never from the request body.
    const booking = await bookingsService.book({ userId: req.user.id, eventId });
    return ok(res, { booking }, 201);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/attendee/bookings?status=CONFIRMED|CANCELLED */
async function list(req, res, next) {
  const { status } = req.query;
  if (status !== undefined && !BOOKING_STATUSES.includes(status)) {
    return fail(res, 'status must be CONFIRMED or CANCELLED', 422, 'INVALID_FILTER');
  }

  try {
    const bookings = await bookingsService.listBookings({ userId: req.user.id, status });
    return ok(res, { bookings });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/attendee/bookings/:id/cancel */
async function cancel(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Booking not found', 404, 'BOOKING_NOT_FOUND');

  try {
    const booking = await bookingsService.cancel({ userId: req.user.id, bookingId: req.params.id });
    return ok(res, { booking });
  } catch (e) {
    return next(e);
  }
}

module.exports = { create, list, cancel };
