// Read-only venues/categories for the create-event form, mounted at /api/organizer.
const router = require('express').Router();
const controller = require('./reference.controller');

router.get('/venues', controller.venues);
router.get('/categories', controller.categories);

module.exports = router;
