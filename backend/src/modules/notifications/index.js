// Module: notifications - the signed-in user's own inbox (FR-06, FR-15, FR-21, FR-17 outcome).
// Every role has an inbox, so there is no role restriction: each request only ever reads or
// changes the caller's own rows.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const controller = require('./notifications.controller');

router.use(requireAuth);

router.get('/', controller.list);
router.post('/read-all', controller.readAll);
router.post('/:id/read', controller.readOne);

module.exports = router;
