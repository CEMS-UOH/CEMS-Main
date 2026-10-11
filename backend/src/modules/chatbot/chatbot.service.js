// FR-23: AI assistant backed by Grok (xAI) - per Leader override, NOT the Anthropic Claude
// API named in the original CLAUDE.md. See CLAUDE.md / README.md for the override record.
// OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { grokApiKey, grokModel } = require('../../config/env');
const { askGrok, GrokError } = require('./grok');

// Keeps the prompt - and the bill - small. Both are deliberately conservative; raise them if
// the assistant starts missing events or forgetting context in practice.
const MAX_EVENTS_IN_PROMPT = 15;
const MAX_HISTORY_MESSAGES = 10; // prior turns resent each call, since store:false (grok.js)
const MAX_EVENT_TITLE_LENGTH = 120;

/** APPROVED events that have not ended yet, soonest first - the only facts Grok is given. */
async function loadUpcomingEvents() {
  const events = await prisma.event.findMany({
    where: { status: 'APPROVED', endsAt: { gt: new Date() } },
    select: {
      title: true,
      startsAt: true,
      venue: { select: { name: true } },
      category: { select: { name: true } },
    },
    orderBy: { startsAt: 'asc' },
    take: MAX_EVENTS_IN_PROMPT,
  });
  return events.map((e) => ({ ...e, title: e.title.slice(0, MAX_EVENT_TITLE_LENGTH) }));
}

function buildSystemPrompt(locale, events) {
  const language = locale === 'ar' ? 'Arabic' : 'English';
  const eventLines = events.length
    ? events
        .map((e) => `- ${e.title} | ${e.startsAt.toISOString()} | ${e.venue?.name ?? 'TBA'} | ${e.category.name}`)
        .join('\n')
    : '(no upcoming approved events right now)';

  return [
    'You are the SCEMS assistant for the Smart Campus Event Manager System at the University of Hail.',
    'Help the user find and understand campus events. Only discuss SCEMS and the events listed below -',
    'politely decline anything else, and never invent an event, date or detail that is not listed.',
    `Reply in ${language}, regardless of what language this system message is written in.`,
    'Keep answers short and factual.',
    '',
    'Upcoming approved events (title | start time UTC | venue | category):',
    eventLines,
  ].join('\n');
}

/**
 * FR-23. `sessionId` is optional - omit it to start a new conversation. When given, it must be
 * one of the caller's own ChatSessions (404 otherwise, same "not found" pattern as the rest of
 * the backend - never reveal that a different session id exists).
 */
async function sendMessage({ userId, sessionId, message, locale }) {
  let session = null;
  if (sessionId) {
    session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId) {
      throw new HttpError(404, 'Chat session not found', 'SESSION_NOT_FOUND');
    }
  }

  const priorMessages = Array.isArray(session?.messages) ? session.messages : [];
  const recentHistory = priorMessages.slice(-MAX_HISTORY_MESSAGES);
  const events = await loadUpcomingEvents();

  const input = [
    { role: 'system', content: buildSystemPrompt(locale, events) },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  let reply;
  try {
    reply = await askGrok({ apiKey: grokApiKey, model: grokModel, input });
  } catch (e) {
    if (!(e instanceof GrokError)) throw e;
    // Logged for our own diagnostics only - askGrok's messages never include the API key, and
    // this never reaches the client, which gets the generic message below.
    console.error(`[chatbot] Grok request failed: ${e.message}`);
    throw new HttpError(503, 'The AI assistant is temporarily unavailable', 'CHATBOT_UNAVAILABLE');
  }

  const nextMessages = [
    ...priorMessages,
    { role: 'user', content: message },
    { role: 'assistant', content: reply },
  ];

  const saved = session
    ? await prisma.chatSession.update({
        where: { id: session.id },
        data: { messages: nextMessages },
        select: { id: true },
      })
    : await prisma.chatSession.create({
        data: { userId, messages: nextMessages },
        select: { id: true },
      });

  return { sessionId: saved.id, reply };
}

module.exports = { sendMessage };
