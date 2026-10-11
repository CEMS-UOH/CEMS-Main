// Module: chatbot
// OWNER: Role 3 (Backend organizer/admin/AI)
// Requirements: FR-23 (AI assistant, Grok/xAI API - Leader override, NOT Anthropic. See
// CLAUDE.md and README.md). Called from the backend only, never from the browser.
const router = require('express').Router();
const requireAuth = require('../../middleware/requireAuth');

// Any logged-in role may use the assistant - no requireRole restriction.
router.use(requireAuth);
router.use('/', require('./chatbot.routes'));

module.exports = router;
