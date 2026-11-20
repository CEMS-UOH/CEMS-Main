// "Recommended for you", mounted at /api/attendee/recommendations. Attendees only: the
// suggestions come from the caller's own bookings and ratings.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const { ok } = require('../../lib/response');
const { recommend } = require('./recommendations.service');

router.use(requireAuth, requireRole('ATTENDEE'));

/** GET /api/attendee/recommendations - no input to validate. */
router.get('/', async (req, res, next) => {
  try {
    return ok(res, await recommend(req.user.id));
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
