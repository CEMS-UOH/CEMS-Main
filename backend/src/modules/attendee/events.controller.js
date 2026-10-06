// HTTP layer for FR-03 / FR-04 / FR-09. All request validation happens HERE (CLAUDE.md rule 5).
const { ok, fail } = require('../../lib/response');
const { isUuid, parseCampusDay, parsePositiveInt } = require('./params');
const eventsService = require('./events.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** GET /api/attendee/events?category=&venue=&date=YYYY-MM-DD&page=&limit= */
async function list(req, res, next) {
  const { category, venue, date, page, limit } = req.query;

  if (category !== undefined && !isUuid(category)) {
    return fail(res, 'category must be a category id', 422, 'INVALID_FILTER');
  }
  if (venue !== undefined && !isUuid(venue)) {
    return fail(res, 'venue must be a venue id', 422, 'INVALID_FILTER');
  }

  let day = null;
  if (date !== undefined) {
    day = parseCampusDay(date);
    if (!day) return fail(res, 'date must be a real date in YYYY-MM-DD format', 422, 'INVALID_FILTER');
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
      categoryId: category,
      venueId: venue,
      day,
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

/** GET /api/attendee/events/:id */
async function details(req, res, next) {
  // A malformed id cannot match any event - same answer as an unknown one.
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  try {
    const event = await eventsService.getEvent(req.params.id);
    return ok(res, { event });
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, details };
