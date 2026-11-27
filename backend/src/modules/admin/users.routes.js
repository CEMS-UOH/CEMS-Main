// Routes for FR-18 and the user half of FR-22, mounted at /api/admin/users.
const router = require('express').Router();
const controller = require('./users.controller');

router.get('/', controller.list);
router.post('/', controller.create);
router.post('/:id/activate', controller.activate);
router.post('/:id/deactivate', controller.deactivate);
router.post('/:id/role', controller.changeRole);
router.delete('/:id', controller.remove);

module.exports = router;
