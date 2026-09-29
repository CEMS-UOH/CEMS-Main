// Routes for FR-01 (register) and FR-02 (login), mounted at /api/attendee/auth
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const controller = require('./auth.controller');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
