// Routes for FR-05..FR-08 (book, cancel, history), mounted at /api/attendee/bookings
// Every route needs a session, and only Attendees book seats.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const controller = require('./bookings.controller');

router.use(requireAuth, requireRole('ATTENDEE'));

router.post('/', controller.create);
router.get('/', controller.list);
router.post('/:id/cancel', controller.cancel);

module.exports = router;
