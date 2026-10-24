// HTTP layer for the notification inbox. All request validation happens HERE (CLAUDE.md rule 5).
// requireAuth runs first (notifications/index.js), so req.user is always set.
const { ok, fail } = require('../../lib/response');
// Reused from the admin module rather than copied a fourth time (CLAUDE.md rule 1).
const { isUuid, parsePositiveInt } = require('../admin/params');
const service = require('./notifications.service');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** GET /api/notifications?unread=true&page=&limit= */
async function list(req, res, next) {
  const { unread, page, limit } = req.query;

  if (unread !== undefined && unread !== 'true' && unread !== 'false') {
    return fail(res, 'unread must be true or false', 422, 'INVALID_FILTER');
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
    const result = await service.listNotifications({
      userId: req.user.id,
      unreadOnly: unread === 'true',
      page: pageNumber,
      limit: pageSize,
    });
    return ok(res, result);
  } catch (e) {
    return next(e);
  }
}

/** POST /api/notifications/:id/read */
async function readOne(req, res, next) {
  if (!isUuid(req.params.id)) {
    return fail(res, 'Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }
  try {
    const notification = await service.markRead({ userId: req.user.id, id: req.params.id });
    return ok(res, { notification });
  } catch (e) {
    return next(e);
  }
}

/** POST /api/notifications/read-all */
async function readAll(req, res, next) {
  try {
    return ok(res, await service.markAllRead(req.user.id));
  } catch (e) {
    return next(e);
  }
}

module.exports = { list, readOne, readAll };
