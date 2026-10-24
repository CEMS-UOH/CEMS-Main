// HTTP layer for FR-14 check-in. All request validation happens HERE (CLAUDE.md rule 5).
const { fail, ok } = require('../../lib/response');
const { isUuid } = require('./params');
const checkinService = require('./checkin.service');

// The ticket QR holds the booking token: 24 random bytes as base64url (32 characters).
// A little slack either side, but nothing that could not be a token is ever looked up.
const CODE_RE = /^[A-Za-z0-9_-]{16,64}$/;

/** POST /api/organizer/events/:id/check-in  { code } - the scanned QR */
async function byCode(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!CODE_RE.test(code)) {
    return fail(res, 'code must be the text of a ticket QR', 422, 'INVALID_CODE');
  }

  try {
    const result = await checkinService.checkInByCode({
      organizerId: req.user.id,
      eventId: req.params.id,
      code,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/organizer/events/:id/attendees/:registrationId/check-in - picked from the list */
async function byId(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  if (!isUuid(req.params.registrationId)) {
    return fail(res, 'No booking matches this ticket', 404, 'TICKET_NOT_FOUND');
  }

  try {
    const result = await checkinService.checkInById({
      organizerId: req.user.id,
      eventId: req.params.id,
      registrationId: req.params.registrationId,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

module.exports = { byCode, byId };
