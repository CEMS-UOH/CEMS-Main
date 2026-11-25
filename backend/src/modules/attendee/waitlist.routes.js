// The caller's waitlist places, mounted at /api/attendee/waitlist. Attendees only.
// Joining and leaving are on the event: POST/DELETE /api/attendee/events/:id/waitlist.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');
const controller = require('./waitlist.controller');

router.use(requireAuth, requireRole('ATTENDEE'));
router.get('/', controller.mine);

module.exports = router;
