# Chatbot API: AI assistant (FR-23)

The JSON contract between the backend (Role 3) and any frontend that embeds the chat widget.
Every response uses the standard envelope from `backend/src/lib/response.js`:
`{ success: true, data }` or `{ success: false, error: { message, code } }`.
Show errors by `code`, translated through the `Errors` namespace (CLAUDE.md rule 9).

Requires a session cookie (`requireAuth`). **No role restriction** - Attendee, Organizer and
Admin may all use the assistant.

## LEADER OVERRIDE: Grok (xAI), not Anthropic

CLAUDE.md originally named the Anthropic Claude API for FR-23. By the Leader's explicit
instruction for this task, **FR-23 uses Grok (xAI) instead** - no Anthropic SDK was added.
CLAUDE.md and README.md are updated to match in this same change.

The backend calls `https://api.x.ai/v1/responses` directly with Node's built-in `fetch` (no new
dependency) - see `backend/src/modules/chatbot/grok.js` for the full integration notes,
confirmed against xAI's official docs on 2026-10-07. **The browser never talks to Grok
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
- Conversation history (up to the last 10 messages) is resent to Grok on every call for
  continuity, since the integration explicitly disables Grok's own server-side conversation
  storage (`store: false` - see `grok.js`) in favour of our own `ChatSession` table.

## Error codes (add these to `frontend/messages/{ar,en}.json` under `Errors`)

| Code | Status | When |
|---|---|---|
| `INVALID_MESSAGE` | 422 | missing, blank, or over 2000 characters |
| `INVALID_LOCALE` | 422 | `locale` is present but not `"ar"` or `"en"` |
| `SESSION_NOT_FOUND` | 404 | malformed, unknown, or someone else's `sessionId` |
| `CHATBOT_UNAVAILABLE` | 503 | `GROK_API_KEY`/`GROK_MODEL` missing, or the Grok call failed/timed out/returned nothing usable - never a crash |

The existing `UNAUTHENTICATED` (401) also applies. There is no `FORBIDDEN` (403) case - every
role may use this endpoint.

## Environment variables

Add to `.env` (see the repo-root `.env.example`):

```
GROK_API_KEY="xai-..."
GROK_MODEL="grok-4.7"
```

Neither is required for the rest of the app to run - `assertRuntimeConfig()` does not check
them, and a missing key fails each chatbot request individually with `CHATBOT_UNAVAILABLE`
rather than blocking the server from starting.
