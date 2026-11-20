// Module: attendee
// OWNER: Role 2 (Backend core)
// Requirements: FR-01..FR-09 (auth, browse, booking, history), plus ratings and
// "recommended for you" (README key features).
// Put routes, controllers and services for this module in THIS folder only.
const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/events', require('./events.routes'));
router.use('/bookings', require('./bookings.routes'));
router.use('/recommendations', require('./recommendations.routes'));

module.exports = router;
