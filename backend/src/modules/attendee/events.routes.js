// Routes for FR-03 / FR-04 (browse + filter) and FR-09 (details), mounted at /api/attendee/events
// Public on purpose: visitors can see what is on before they register. Booking needs a session.
// Also POST /:id/feedback (rate an event after it ends), Attendees only.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const controller = require('./events.controller');
const feedbackController = require('./feedback.controller');

router.get('/', controller.list);
router.get('/:id', controller.details);
// Rating an event after it ends: the one route here that needs a session.
router.post('/:id/feedback', requireAuth, requireRole('ATTENDEE'), feedbackController.create);

module.exports = router;
