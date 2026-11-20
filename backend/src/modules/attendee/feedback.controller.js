// HTTP layer for event ratings. All request validation happens HERE (CLAUDE.md rule 5).
const { fail, ok } = require('../../lib/response');
const { isUuid } = require('./params');
const feedbackService = require('./feedback.service');

const MAX_COMMENT_LENGTH = 1000;

/** POST /api/attendee/events/:id/feedback  { rating: 1..5, comment? } */
async function create(req, res, next) {
  if (!isUuid(req.params.id)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');

  const { rating, comment } = req.body || {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return fail(res, 'rating must be a whole number from 1 to 5', 422, 'INVALID_RATING');
  }
  if (comment !== undefined && comment !== null) {
    if (typeof comment !== 'string' || comment.length > MAX_COMMENT_LENGTH) {
      return fail(res, 'comment must be text of up to 1000 characters', 422, 'INVALID_COMMENT');
    }
  }
  const text = typeof comment === 'string' && comment.trim() ? comment.trim() : null;

  try {
    const feedback = await feedbackService.createFeedback({
      userId: req.user.id,
      eventId: req.params.id,
      rating,
      comment: text,
    });
    return ok(res, { feedback }, 201);
  } catch (e) {
    return next(e);
  }
}

module.exports = { create };
