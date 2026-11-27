// Route for FR-23, mounted at /api/chatbot. requireAuth only - every role may use it.
const router = require('express').Router();
const controller = require('./chatbot.controller');

router.post('/', controller.send);

module.exports = router;
