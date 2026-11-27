// The AI assistant (FR-23): backend/src/modules/chatbot/API.md.
// The browser only ever talks to our backend; the backend talks to the AI provider
// (CLAUDE.md rule 9), so no AI key is ever in the browser.
import { apiFetch } from './api';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** The API accepts up to 2000 characters per message. */
export const CHAT_MESSAGE_MAX = 2000;

export const sendChatMessage = (input: { message: string; sessionId?: string; locale: 'ar' | 'en' }) =>
  apiFetch<{ sessionId: string; reply: string }>('/api/chatbot', {
    method: 'POST',
    body: JSON.stringify(input),
  });
