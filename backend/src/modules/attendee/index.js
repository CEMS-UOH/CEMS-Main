// Module: attendee
// OWNER: Role 2 (Backend core)
// Requirements: FR-01..FR-09 (auth, browse, booking, history)
// Put routes, controllers and services for this module in THIS folder only.
const router = require('express').Router();

router.use('/auth', require('./auth.routes'));

module.exports = router;
