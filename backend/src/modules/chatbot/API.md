# Chatbot API: AI assistant (FR-23)

The JSON contract between the backend (Role 3) and any frontend that embeds the chat widget.
Every response uses the standard envelope from `backend/src/lib/response.js`:
`{ success: true, data }` or `{ success: false, error: { message, code } }`.
Show errors by `code`, translated through the `Errors` namespace (CLAUDE.md rule 9).

Requires a session cookie (`requireAuth`). **No role restriction** - Attendee, Organizer and
Admin may all use the assistant.

## LEADER DECISION: Groq, not Anthropic (and not xAI)

CLAUDE.md originally named the Anthropic Claude API for FR-23; the Leader first switched it to
xAI's Grok, then to **Groq** (groq.com - a different company), whose key the team holds.
No SDK was added.

The backend calls Groq's OpenAI-compatible `https://api.groq.com/openai/v1/chat/completions`
with Node's built-in `fetch` - see `backend/src/modules/chatbot/groq.js` for the integration
notes, confirmed against Groq's docs on 2026-10-24. Default model: **`openai/gpt-oss-120b`**
(Groq's largest production model; Arabic and English). **The browser never talks to Groq
directly** - only this backend endpoint does (CLAUDE.md rule 9).

## Endpoint

| Method and path | Success `data` |
|---|---|
| `POST /api/chatbot` body `{ message, sessionId?, locale? }` | `201 { sessionId: string, reply: string }` |

```ts
type ChatRequest = {
  message: string;     // required, 1..2000 characters
  sessionId?: string;  // omit to start a new conversation; must be one of YOUR OWN sessions
  locale?: 'ar' | 'en'; // omit to auto-detect from the message's script
};

type ChatResponse = { sessionId: string; reply: string };
```

- Omitting `sessionId` starts a new conversation (a new `ChatSession` row) and returns its id -
  pass that same id on the next call to continue the same conversation. Someone else's
  `sessionId` (or an unknown one) is reported `404 SESSION_NOT_FOUND`, same as other modules'
  "not found" pattern - it never reveals whether the id exists.
- `locale` controls the assistant's reply language. If omitted, the backend guesses from
  whether the message contains Arabic script - pass it explicitly for a reliable answer
  (the frontend already knows the active next-intl locale).
- The assistant only knows about **APPROVED events that have not ended yet** (soonest 15,
  server-side, from the database) - it cannot discuss PENDING/REJECTED/CANCELLED events, and is
  instructed not to invent details. It is scoped to SCEMS and politely declines anything else.
- Conversation history (up to the last 10 messages) is resent on every call for continuity -
  the chat API keeps no history itself; ours lives in the `ChatSession` table.
- Event times are given to the model in campus time (Asia/Riyadh, UTC+3).

## Error codes (add these to `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `INVALID_MESSAGE` | 422 | missing, blank, or over 2000 characters |
| `INVALID_LOCALE` | 422 | `locale` is present but not `"ar"` or `"en"` |
| `SESSION_NOT_FOUND` | 404 | malformed, unknown, or someone else's `sessionId` |
| `CHATBOT_UNAVAILABLE` | 503 | `GROQ_API_KEY` missing, or the Groq call failed/timed out/returned nothing usable - never a crash |

The existing `UNAUTHENTICATED` (401) also applies. There is no `FORBIDDEN` (403) case - every
role may use this endpoint.

## Environment variables

Add to `.env` (see the repo-root `.env.example`):

```
GROQ_API_KEY="gsk_..."
GROQ_MODEL="openai/gpt-oss-120b"   # optional - this is the default
```

Neither is required for the rest of the app to run - `assertRuntimeConfig()` does not check
them, and a missing key fails each chatbot request individually with `CHATBOT_UNAVAILABLE`
rather than blocking the server from starting.
