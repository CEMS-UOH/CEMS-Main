// Module: analytics (FR-20). OWNER: Role 6 (Data Analytics).
// Mounted by the admin module at /api/admin/analytics, so it inherits requireAuth +
// requireRole('ADMIN'). See API.md.
const router = require('express').Router();
const controller = require('./analytics.controller');

router.get('/', controller.overview);
router.get('/predictions', controller.predictions);

module.exports = router;
