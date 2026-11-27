// HTTP layer for FR-17 and the event half of FR-22. All request validation happens HERE
// (CLAUDE.md rule 5). requireAuth + requireRole('ADMIN') run first (admin/index.js).
const { ok, fail } = require('../../lib/response');
const { isUuid, parsePositiveInt } = require('./params');
const eventsService = require('./events.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const EVENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

/** GET /api/admin/events?status=&organizerId=&page=&limit= - not in the FR list, see events.service.js */
async function list(req, res, next) {
  const { status, organizerId, page, limit } = req.query;

  if (status !== undefined && !EVENT_STATUSES.includes(status)) {
    return fail(res, 'status must be a real event status', 422, 'INVALID_FILTER');
  }
  if (organizerId !== undefined && !isUuid(organizerId)) {
    return fail(res, 'organizerId must be a user id', 422, 'INVALID_FILTER');
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
    const result = await eventsService.listEvents({
      status,
      organizerId,
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/events/:id/approve */
async function approve(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  try {
    const event = await eventsService.approveEvent(req.params.id);
    return ok(res, { event });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/admin/events/:id/reject */
async function reject(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  try {
    const event = await eventsService.rejectEvent(req.params.id);
    return ok(res, { event });
  } catch (e) {
    return next(e);
  }
}

/** DELETE /api/admin/events/:id */
async function remove(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  try {
    await eventsService.deleteEvent(req.params.id);
    return ok(res, { deleted: true });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, approve, reject, remove };
