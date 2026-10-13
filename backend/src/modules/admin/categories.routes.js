// Routes for FR-19, mounted at /api/admin/categories.
const router = require('express').Router();
const controller = require('./categories.controller');

router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
