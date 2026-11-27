// Route for FR-21, mounted at /api/admin/broadcast.
const router = require('express').Router();
const controller = require('./broadcast.controller');

router.post('/', controller.create);

module.exports = router;
