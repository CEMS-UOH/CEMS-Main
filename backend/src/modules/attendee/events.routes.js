// Routes for FR-03 / FR-04 (browse + filter) and FR-09 (details), mounted at /api/attendee/events
// Public on purpose: visitors can see what is on before they register. Booking needs a session.
const router = require('express').Router();
const controller = require('./events.controller');

router.get('/', controller.list);
router.get('/:id', controller.details);

module.exports = router;
