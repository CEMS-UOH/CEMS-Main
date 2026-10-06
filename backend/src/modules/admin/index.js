// Module: admin
// OWNER: Role 3 for this task, by LEADER OVERRIDE (normally Role 2 - see CLAUDE.md).
// Requirements: FR-17 (approve/reject), FR-18 (users), FR-19 (categories), FR-21 (broadcast),
// FR-22 (permanent delete). FR-20 (analytics) is skipped - Role 6's job.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');
const requireRole = require('../../middleware/requireRole');

router.use(requireAuth, requireRole('ADMIN'));

router.use('/events', require('./events.routes'));
router.use('/users', require('./users.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/broadcast', require('./broadcast.routes'));

module.exports = router;
