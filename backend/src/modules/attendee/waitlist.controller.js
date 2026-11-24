// HTTP layer for the waitlist. All request validation happens HERE (CLAUDE.md rule 5).
// requireAuth + requireRole('ATTENDEE') run first, so req.user is set.
const { ok, fail } = require('../../lib/response');
const { isUuid } = require('./params');
const waitlistService = require('./waitlist.service');

/** POST /api/attendee/events/:id/waitlist */
async function join(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  try {
    return ok(res, await waitlistService.join({ userId: req.user.id, eventId: req.params.id }), 201);
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/attendee/events/:id/waitlist */
async function leave(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'You are not on this waitlist', 404, 'NOT_ON_WAITLIST');
  try {
    return ok(res, await waitlistService.leave({ userId: req.user.id, eventId: req.params.id }));
  } catch (e) {
    return next(e);
  }
}

/** GET /api/attendee/waitlist */
async function mine(req, res, next) {
  try {
    return ok(res, await waitlistService.listMine(req.user.id));
  } catch (e) {
    return next(e);
  }
}

module.exports = { join, leave, mine };
