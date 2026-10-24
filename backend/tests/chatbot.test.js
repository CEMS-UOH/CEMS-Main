// FR-23: AI assistant. groq.js is mocked at the module boundary, so Groq is never called and
// no network traffic happens - only tests/groq.test.js exercises the real HTTP wrapper logic
// (with fetch mocked). Prisma is mocked like health.test.js.
jest.mock('../src/lib/prisma', () => ({
  user: { findUnique: jest.fn() },
  event: { findMany: jest.fn() },
  chatSession: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
}));

// The mock factory may not reference out-of-scope variables (Jest hoists jest.mock calls
// above imports), so AssistantError is defined inline here and read back via the mocked module.
jest.mock('../src/modules/chatbot/groq', () => ({
  askAssistant: jest.fn(),
  AssistantError: class AssistantError extends Error {},
}));

const request = require('supertest');
const prisma = require('../src/lib/prisma');
const { askAssistant, AssistantError: FakeAssistantError } = require('../src/modules/chatbot/groq');
const app = require('../src/app');
const { COOKIE_NAME, signToken } = require('../src/lib/session');

const BASE = '/api/chatbot';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const attendee = {
  id: 'user-1',
  email: 'sara@example.com',
  fullName: 'Sara Ahmed',
  role: 'ATTENDEE',
  isActive: true,
  createdAt: new Date(),
};

const sessionFor = (user = attendee) => {
  prisma.user.findUnique.mockResolvedValueOnce(user);
  return `${COOKIE_NAME}=${signToken(user)}`;
};

beforeEach(() => jest.resetAllMocks());

// ---------------------------------------------------------------- auth

describe('chatbot auth', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).post(BASE).send({ message: 'hi' });
    expect(res.status).toBe(401);
  });

  it.each(['ATTENDEE', 'ORGANIZER', 'ADMIN'])('allows a logged-in %s (no role restriction)', async (role) => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.chatSession.create.mockResolvedValueOnce({ id: SESSION_ID });
    askAssistant.mockResolvedValueOnce('Hello!');

    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor({ ...attendee, role }))
      .send({ message: 'hi' });

    expect(res.status).toBe(201);
  });
});

// ---------------------------------------------------------------- happy path

describe('POST /chatbot (FR-23)', () => {
  it('starts a new session, asks the model with the event list in the system prompt, and saves both turns', async () => {
    prisma.event.findMany.mockResolvedValueOnce([
      {
        title: 'AI Workshop',
        startsAt: new Date('2026-12-01T10:00:00.000Z'),
        venue: { name: 'Main Hall' },
        category: { name: 'Workshop' },
      },
    ]);
    prisma.chatSession.create.mockResolvedValueOnce({ id: SESSION_ID });
    askAssistant.mockResolvedValueOnce('There is an AI Workshop on Dec 1st.');

    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'What events are coming up?', locale: 'en' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({ sessionId: SESSION_ID, reply: 'There is an AI Workshop on Dec 1st.' });

    const { messages: input } = askAssistant.mock.calls[0][0];
    expect(input[0].role).toBe('system');
    expect(input[0].content).toMatch(/AI Workshop/);
    // 10:00 UTC is 13:00 on campus (Asia/Riyadh, UTC+3).
    expect(input[0].content).toMatch(/2026-12-01 13:00 \(Tuesday\)/);
    expect(input[0].content).toMatch(/Reply in English/);
    expect(input[input.length - 1]).toEqual({ role: 'user', content: 'What events are coming up?' });

    const saved = prisma.chatSession.create.mock.calls[0][0].data;
    expect(saved.userId).toBe('user-1');
    expect(saved.messages).toEqual([
      { role: 'user', content: 'What events are coming up?' },
      { role: 'assistant', content: 'There is an AI Workshop on Dec 1st.' },
    ]);
  });

  it('only queries APPROVED, not-yet-ended events for the prompt', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.chatSession.create.mockResolvedValueOnce({ id: SESSION_ID });
    askAssistant.mockResolvedValueOnce('No events yet.');

    await request(app).post(BASE).set('Cookie', sessionFor()).send({ message: 'hi', locale: 'en' });

    const args = prisma.event.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('APPROVED');
    expect(args.where.endsAt.gt).toBeInstanceOf(Date);
  });

  it('continues an existing session owned by the caller, resending its history', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({
      id: SESSION_ID,
      userId: 'user-1',
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello! How can I help?' },
      ],
    });
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.chatSession.update.mockResolvedValueOnce({ id: SESSION_ID });
    askAssistant.mockResolvedValueOnce('Sure, here is more detail.');

    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'Tell me more', sessionId: SESSION_ID, locale: 'en' });

    expect(res.status).toBe(201);
    const { messages: input } = askAssistant.mock.calls[0][0];
    expect(input).toEqual([
      expect.objectContaining({ role: 'system' }),
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help?' },
      { role: 'user', content: 'Tell me more' },
    ]);

    const updateCall = prisma.chatSession.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: SESSION_ID });
    expect(updateCall.data.messages).toHaveLength(4);
    expect(prisma.chatSession.create).not.toHaveBeenCalled();
  });

  it('replies in Arabic when the message is in Arabic and locale is not given', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.chatSession.create.mockResolvedValueOnce({ id: SESSION_ID });
    askAssistant.mockResolvedValueOnce('مرحباً!');

    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'ما هي الفعاليات القادمة؟' });

    expect(res.status).toBe(201);
    expect(askAssistant.mock.calls[0][0].messages[0].content).toMatch(/Reply in Arabic/);
  });

  it('respects an explicit locale even when the message itself is in the other language', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    prisma.chatSession.create.mockResolvedValueOnce({ id: SESSION_ID });
    askAssistant.mockResolvedValueOnce('ok');

    await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'hello', locale: 'ar' });

    expect(askAssistant.mock.calls[0][0].messages[0].content).toMatch(/Reply in Arabic/);
  });
});

// ---------------------------------------------------------------- validation

describe('POST /chatbot validation', () => {
  it('rejects an empty message with 422', async () => {
    const res = await request(app).post(BASE).set('Cookie', sessionFor()).send({ message: '   ' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_MESSAGE');
    expect(askAssistant).not.toHaveBeenCalled();
  });

  it('rejects a too-long message with 422', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'x'.repeat(2001) });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_MESSAGE');
  });

  it('rejects an invalid locale with 422', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'hi', locale: 'fr' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_LOCALE');
  });

  it('rejects a malformed sessionId with 404 SESSION_NOT_FOUND, without touching the database', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'hi', sessionId: 'not-a-uuid' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    expect(prisma.chatSession.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown sessionId', async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'hi', sessionId: SESSION_ID });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });

  it("returns 404 for someone else's sessionId, same as an unknown one", async () => {
    prisma.chatSession.findUnique.mockResolvedValueOnce({
      id: SESSION_ID,
      userId: 'someone-else',
      messages: [],
    });
    const res = await request(app)
      .post(BASE)
      .set('Cookie', sessionFor())
      .send({ message: 'hi', sessionId: SESSION_ID });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
  });
});

// ---------------------------------------------------------------- Groq failure

describe('POST /chatbot when Groq fails', () => {
  it('returns a clean 503 instead of crashing, and saves nothing', async () => {
    prisma.event.findMany.mockResolvedValueOnce([]);
    askAssistant.mockRejectedValueOnce(new FakeAssistantError('GROK_API_KEY is not configured'));

    const res = await request(app).post(BASE).set('Cookie', sessionFor()).send({ message: 'hi' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CHATBOT_UNAVAILABLE');
    expect(res.body.error.message).not.toMatch(/GROQ_API_KEY/);
    expect(prisma.chatSession.create).not.toHaveBeenCalled();
    expect(prisma.chatSession.update).not.toHaveBeenCalled();
  });
});
