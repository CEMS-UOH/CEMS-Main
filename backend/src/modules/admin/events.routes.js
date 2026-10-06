// Routes for FR-17 and the event half of FR-22, mounted at /api/admin/events.
const router = require('express').Router();
const controller = require('./events.controller');

router.get('/', controller.list);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.delete('/:id', controller.remove);

module.exports = router;
