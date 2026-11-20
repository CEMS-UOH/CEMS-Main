// FR-23: AI assistant backed by Groq (groq.com, model openai/gpt-oss-120b by default) - per
// Leader decision, NOT the Anthropic Claude API named in the original CLAUDE.md. See CLAUDE.md.
// OWNER: Role 3. Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
const { groqApiKey, groqModel } = require('../../config/env');
const { askAssistant, AssistantError } = require('./groq');

// Keeps the prompt - and the bill - small. Both are deliberately conservative; raise them if
// the assistant starts missing events or forgetting context in practice.
const MAX_EVENTS_IN_PROMPT = 15;
const MAX_HISTORY_MESSAGES = 10; // prior turns resent each call - the API keeps no history
const MAX_EVENT_TITLE_LENGTH = 120;

/** APPROVED events that have not ended yet, soonest first - the only facts the model is given. */
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

// Event times are written out for the model in campus time (Asia/Riyadh, UTC+3) and already in
// the reader's language, so it can copy them as they are - in UTC it would tell people an hour
// three hours off, and left to itself it formats dates inconsistently.
const DATE_FORMAT = {
  ar: new Intl.DateTimeFormat('ar-u-ca-gregory-nu-latn', {
    timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  }),
  en: new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh', weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  }),
};

function buildSystemPrompt(locale, events) {
  const lang = locale === 'ar' ? 'ar' : 'en';
  const language = lang === 'ar' ? 'Arabic' : 'English';
  const eventLines = events.length
    ? events
        .map((e) => `- ${e.title} | ${DATE_FORMAT[lang].format(e.startsAt)} | ${e.venue?.name ?? 'TBA'} | ${e.category.name}`)
        .join('\n')
    : '(no upcoming approved events right now)';

  return [
    'You are the assistant of the Smart Campus Event Manager System (SCEMS) at the University of Hail.',
    'You help people find campus events and use SCEMS.',
    '',
    'Rules:',
    `1. Reply in ${language} only.`,
    '2. Answer exactly what was asked. When the question is about a topic, a day or a kind of event,',
    '   mention ONLY the events below that match it (by title or category). If none match, say so in',
    '   one sentence and offer to show all upcoming events. List every event only when asked for all.',
    '3. Any question about events is on topic - including events ABOUT a subject ("events about AI",',
    '   "فعاليات عن الذكاء الاصطناعي", "sports events"), about a day, a place or a category, and follow-up',
    '   questions about events already mentioned ("which one is first?"). Only when the message asks',
    '   for something else entirely (write a poem, solve homework, explain a general topic, other',
    '   websites) politely decline in one short sentence, say what you can help with, and list no events.',
    '4. Plain text only: no tables, no markdown, no headings, no bold. For several events write one',
    '   line per event starting with "- ": title, then date and time, then venue.',
    '5. Copy titles, dates, times and venues exactly as written below. Never invent an event, a date,',
    '   a price or any detail that is not listed.',
    '6. Be brief: at most 6 lines.',
    '',
    'How SCEMS works (for "how do I" questions): browse events on the Events page; open an event and',
    'press Book to reserve a seat (Attendee accounts only); the QR ticket is in My bookings and is',
    'scanned at the door; a booking can be cancelled from My bookings until the event starts; after',
    'an event ends, attendees who held a seat can rate it from My bookings. Organizers create events',
    'from their dashboard and an admin approves them.',
    '',
    'Upcoming approved events (title | start, campus time | venue | category):',
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
    reply = await askAssistant({ apiKey: groqApiKey, model: groqModel, messages: input });
  } catch (e) {
    if (!(e instanceof AssistantError)) throw e;
    // Logged for our own diagnostics only - askAssistant's messages never include the API key, and
    // this never reaches the client, which gets the generic message below.
    console.error(`[chatbot] Groq request failed: ${e.message}`);
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
