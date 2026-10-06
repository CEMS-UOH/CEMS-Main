// HTTP layer for FR-23. All request validation happens HERE (CLAUDE.md rule 5).
// requireAuth runs first (chatbot/index.js) - any logged-in role (Attendee, Organizer, Admin)
// may use the assistant; there is no requireRole restriction.
const { ok, fail } = require('../../lib/response');
const { isUuid, isNonEmptyString, isValidLocale, detectLocale } = require('./params');
const chatbotService = require('./chatbot.service');

const MAX_MESSAGE_LENGTH = 2000;

/** POST /api/chatbot  { message, sessionId?, locale? } */
async function send(req, res, next) {
  const { message, sessionId, locale } = req.body || {};

  if (!isNonEmptyString(message) || message.length > MAX_MESSAGE_LENGTH) {
    return fail(
      res,
      `message is required (max ${MAX_MESSAGE_LENGTH} characters)`,
      422,
      'INVALID_MESSAGE'
    );
  }
  if (sessionId !== undefined && !isUuid(sessionId)) {
    return fail(res, 'Chat session not found', 404, 'SESSION_NOT_FOUND');
  }
  if (locale !== undefined && !isValidLocale(locale)) {
    return fail(res, 'locale must be "ar" or "en"', 422, 'INVALID_LOCALE');
  }

  const trimmed = message.trim();

  try {
    const result = await chatbotService.sendMessage({
      userId: req.user.id,
      sessionId,
      message: trimmed,
      locale: locale || detectLocale(trimmed),
    });
    return ok(res, result, 201);
  } catch (e) {
    return next(e);
  }
}

module.exports = { send };
