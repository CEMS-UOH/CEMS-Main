// HTTP layer for FR-14. All request validation happens HERE (CLAUDE.md rule 5).
const { fail, ok } = require('../../lib/response');
const { isUuid, parsePositiveInt } = require('./params');
const attendeesService = require('./attendees.service');

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const STATUSES = ['CONFIRMED', 'CANCELLED'];

/** GET /api/organizer/events/:id/attendees?status=&page=&limit= */
async function list(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  const { status, page, limit } = req.query;
  if (status !== undefined && !STATUSES.includes(status)) {
    return fail(res, 'status must be CONFIRMED or CANCELLED', 422, 'INVALID_FILTER');
  }
  const pageNumber = parsePositiveInt(page, 1);
  const pageSize = parsePositiveInt(limit, DEFAULT_PAGE_SIZE);
  if (pageNumber === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return fail(
      res,
      `page must be 1 or more and limit between 1 and ${MAX_PAGE_SIZE}`,
      422,
      'INVALID_PAGINATION'
    );
  }

  try {
    const result = await attendeesService.listEventAttendees({
      organizerId: req.user.id,
      eventId: req.params.id,
      status,
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

module.exports = { list };
