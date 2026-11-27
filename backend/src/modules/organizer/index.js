// Module: organizer
// OWNER: Role 3 (Backend organizer/admin/AI)
// Requirements: FR-10..FR-16 (create/edit/delete own events, capacity rules, attendee list,
// capacity-full notice, image/attachment URLs) + read-only venues/categories for the form.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

router.use(requireAuth, requireRole('ORGANIZER'));

router.use('/events', require('./events.routes'));
router.use('/', require('./reference.routes'));

module.exports = router;
