// HTTP layer for reading an event's ratings. All request validation happens HERE (CLAUDE.md rule 5).
const { fail, ok } = require('../../lib/response');
const { isUuid, parsePositiveInt } = require('./params');
const feedbackService = require('./feedback.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** GET /api/organizer/events/:id/feedback?page=&limit= */
async function list(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  const pageNumber = parsePositiveInt(req.query.page, 1);
  const pageSize = parsePositiveInt(req.query.limit, DEFAULT_PAGE_SIZE);
  if (pageNumber === null || pageSize === null || pageSize > MAX_PAGE_SIZE) {
    return fail(
      res,
      `page must be 1 or more and limit between 1 and ${MAX_PAGE_SIZE}`,
      422,
      'INVALID_PAGINATION'
    );
  }

  try {
    const result = await feedbackService.listEventFeedback({
      organizerId: req.user.id,
      eventId: req.params.id,
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

module.exports = { list };
