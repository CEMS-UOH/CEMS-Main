// Routes for FR-03 / FR-04 (browse + filter) and FR-09 (details), mounted at /api/attendee/events
// Public on purpose: visitors can see what is on before they register. Booking needs a session.
// Also POST /:id/feedback (rate an event after it ends), Attendees only.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const controller = require('./events.controller');
const feedbackController = require('./feedback.controller');
const waitlistController = require('./waitlist.controller');

router.get('/', controller.list);
router.get('/:id', controller.details);
// The routes below need a session: rating an event, and its waitlist.
router.post('/:id/feedback', requireAuth, requireRole('ATTENDEE'), feedbackController.create);
// The waitlist of a full event.
router.post('/:id/waitlist', requireAuth, requireRole('ATTENDEE'), waitlistController.join);
router.delete('/:id/waitlist', requireAuth, requireRole('ATTENDEE'), waitlistController.leave);

module.exports = router;
