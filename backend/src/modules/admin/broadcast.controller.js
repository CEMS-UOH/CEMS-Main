// HTTP layer for FR-21. All request validation happens HERE (CLAUDE.md rule 5).
const { ok, fail } = require('../../lib/response');
const broadcastService = require('./broadcast.service');

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/** POST /api/admin/broadcast  { title, body } */
async function create(req, res, next) {
  const { title, body } = req.body || {};

  if (!isNonEmptyString(title) || title.trim().length > MAX_TITLE_LENGTH) {
    return fail(res, 'title is required (max 200 characters)', 422, 'INVALID_TITLE');
  }
  if (!isNonEmptyString(body) || body.trim().length > MAX_BODY_LENGTH) {
    return fail(res, 'body is required (max 2000 characters)', 422, 'INVALID_BODY');
  }

  try {
    const result = await broadcastService.broadcast({ title: title.trim(), body: body.trim() });
    return ok(res, result, 201);
  } catch (e) {
    return next(e);
  }
}

module.exports = { create };
