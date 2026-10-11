// Routes for FR-10..FR-14 and FR-16, mounted at /api/organizer/events.
// requireAuth + requireRole('ORGANIZER') are applied once in organizer/index.js.
const router = require('express').Router();
const eventsController = require('./events.controller');
const attendeesController = require('./attendees.controller');

router.post('/', eventsController.create);
router.get('/', eventsController.list);
router.get('/:id', eventsController.details);
router.patch('/:id', eventsController.update);
router.delete('/:id', eventsController.remove);
router.get('/:id/attendees', attendeesController.list);

module.exports = router;
