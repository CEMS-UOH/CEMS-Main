// Saved events, mounted at /api/attendee/favorites. Attendees only.
// PUT and DELETE are idempotent: the heart button can be pressed twice without an error.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const { ok, fail } = require('../../lib/response');
const { isUuid } = require('./params');
const favorites = require('./favorites.service');

router.use(requireAuth, requireRole('ATTENDEE'));

/** GET /api/attendee/favorites */
router.get('/', async (req, res, next) => {
  try {
    return ok(res, await favorites.list(req.user.id));
  } catch (e) {
    return next(e);
  }
});

/** PUT /api/attendee/favorites/:eventId */
router.put('/:eventId', async (req, res, next) => {
  if (!isUuid(req.params.eventId)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  try {
    return ok(res, await favorites.add({ userId: req.user.id, eventId: req.params.eventId }));
  } catch (e) {
    return next(e);
  }
});

/** DELETE /api/attendee/favorites/:eventId */
router.delete('/:eventId', async (req, res, next) => {
  if (!isUuid(req.params.eventId)) return fail(res, 'Event not found', 404, 'EVENT_NOT_FOUND');
  try {
    return ok(res, await favorites.remove({ userId: req.user.id, eventId: req.params.eventId }));
  } catch (e) {
    return next(e);
  }
});

module.exports = router;
