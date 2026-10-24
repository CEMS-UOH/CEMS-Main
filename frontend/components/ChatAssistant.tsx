'use client';

// The AI assistant (FR-23): a round button in the bottom corner of every signed-in screen that
// opens a small chat panel. The assistant knows the upcoming approved events and answers in
// the page's language (the backend tells it which).
//
// The conversation survives moving between pages and a reload of the tab (sessionStorage,
// per user), and is gone when the tab is closed. "New conversation" starts over.
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CHAT_MESSAGE_MAX, sendChatMessage, type ChatTurn } from '@/lib/chatbot';
import { useApiError } from '@/lib/useApiError';
import Button from './Button';
import { ChatIcon, CloseIcon, SendIcon, SpinnerIcon } from './Icons';
import { FOCUS_RING } from './styles';

type Stored = { sessionId?: string; turns: ChatTurn[] };

// Error codes of POST /api/chatbot. Their texts live under "Errors" in messages/*.json.
const CHAT_CODES = ['INVALID_MESSAGE', 'INVALID_LOCALE', 'SESSION_NOT_FOUND', 'CHATBOT_UNAVAILABLE'];

const storageKey = (userId: string) => `scems:chat:${userId}`;

function load(userId: string): Stored {
  try {
    const raw = sessionStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    if (parsed && Array.isArray(parsed.turns)) return parsed;
  } catch {
    // Storage blocked or unreadable: start empty.
  }
  return { turns: [] };
}

function save(userId: string, value: Stored) {
  try {
    sessionStorage.setItem(storageKey(userId), JSON.stringify(value));
  } catch {
    // Not being able to remember the chat is not worth interrupting the user for.
  }
}

/** Replies are plain text; drop the **bold** markers a model sometimes adds. */
const tidy = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '$1');

export default function ChatAssistant({ userId }: { userId: string }) {
  const t = useTranslations('Assistant');
  const tErrors = useTranslations('Errors');
  const sharedError = useApiError();
  const locale = useLocale() === 'ar' ? 'ar' : 'en';

  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<Stored>({ turns: [] });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Restore this user's conversation once we are in the browser.
  useEffect(() => setChat(load(userId)), [userId]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Keep the newest message in view.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [chat.turns.length, sending, open]);

  function close() {
    setOpen(false);
    launcherRef.current?.focus();
  }

  function errorText(code: string) {
    return CHAT_CODES.includes(code) ? tErrors(code) : sharedError(code);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    setError(null);
    setDraft('');
    const withQuestion: Stored = { ...chat, turns: [...chat.turns, { role: 'user', content: message }] };
    setChat(withQuestion);
    setSending(true);

    let result = await sendChatMessage({ message, sessionId: chat.sessionId, locale });
    // The stored conversation may be gone on the server (another device, a cleared database):
    // carry on in a fresh one rather than failing.
    if (!result.ok && result.code === 'SESSION_NOT_FOUND') {
      result = await sendChatMessage({ message, locale });
    }
    setSending(false);

    if (!result.ok) {
      // Take the question back out and put it in the box again, so it can be re-sent.
      setChat(chat);
      setDraft(message);
      setError(errorText(result.code));
      return;
    }
    const next: Stored = {
      sessionId: result.data.sessionId,
      turns: [...withQuestion.turns, { role: 'assistant', content: tidy(result.data.reply) }],
    };
    setChat(next);
    save(userId, next);
  }

  function startOver() {
    const empty: Stored = { turns: [] };
    setChat(empty);
    save(userId, empty);
    setError(null);
    inputRef.current?.focus();
  }

  const suggestions = [t('suggest.week'), t('suggest.ai'), t('suggest.book')];

  return (
    <>
      {!open ? (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('open')}
          aria-haspopup="dialog"
          className={`fixed end-4 bottom-4 z-30 grid size-14 cursor-pointer place-items-center rounded-full bg-primary text-white shadow-[var(--shadow-card-hover)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-primary-dark motion-reduce:transform-none sm:end-6 sm:bottom-6 ${FOCUS_RING}`}
        >
          <ChatIcon className="size-7" />
        </button>
      ) : null}

      {open ? (
        <section
          role="dialog"
          aria-labelledby="assistant-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
          className="fixed inset-x-2 bottom-2 z-30 flex max-h-[min(36rem,calc(100dvh-1rem))] animate-rise flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card-hover)] sm:inset-x-auto sm:end-6 sm:bottom-6 sm:w-[24rem]"
        >
          <header className="flex items-center gap-3 border-b border-border bg-primary-dark px-4 py-3 text-white">
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
              <ChatIcon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col text-start">
              <h2 id="assistant-title" className="text-base font-bold">
                {t('title')}
              </h2>
              <p className="truncate text-xs text-white/75">{t('subtitle')}</p>
            </div>
            {chat.turns.length > 0 ? (
              <button
                type="button"
                onClick={startOver}
                className={`cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-white/85 hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
              >
                {t('newChat')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={close}
              aria-label={t('close')}
              className={`grid size-9 cursor-pointer place-items-center rounded-md text-white/85 hover:bg-white/10 hover:text-white ${FOCUS_RING}`}
            >
              <CloseIcon className="size-5" />
            </button>
          </header>

          {/* The conversation. role="log" announces each new message to screen readers. */}
          <div role="log" aria-live="polite" aria-busy={sending} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {chat.turns.length === 0 ? (
              <div className="flex flex-col gap-3 text-start">
                <p className="text-sm text-text">{t('welcome')}</p>
                <div className="flex flex-col items-start gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className={`cursor-pointer rounded-full border border-primary/30 px-3 py-1.5 text-start text-sm text-primary transition-colors duration-150 hover:bg-primary-light ${FOCUS_RING}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chat.turns.map((turn, i) => (
                <p
                  key={i}
                  dir="auto"
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line [overflow-wrap:anywhere] ${
                    turn.role === 'user'
                      ? 'self-end bg-primary text-white'
                      : 'self-start bg-background text-text'
                  }`}
                >
                  <span className="sr-only">{turn.role === 'user' ? t('you') : t('assistant')}: </span>
                  {turn.content}
                </p>
              ))
            )}
            {sending ? (
              <p className="flex items-center gap-2 self-start rounded-lg bg-background px-3 py-2 text-sm text-text-muted">
                <SpinnerIcon />
                {t('thinking')}
              </p>
            ) : null}
            <div ref={endRef} />
          </div>

          {error ? (
            <p role="alert" className="border-t border-danger/20 bg-danger-light px-4 py-2 text-start text-sm text-danger">
              {error}
            </p>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              {t('inputLabel')}
            </label>
            <textarea
              id="assistant-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={CHAT_MESSAGE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter starts a new line.
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder={t('placeholder')}
              dir="auto"
              className={`max-h-32 min-h-11 flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-muted ${FOCUS_RING}`}
            />
            <Button
              type="submit"
              aria-label={t('send')}
              loading={sending}
              disabled={!draft.trim()}
              icon={sending ? undefined : <SendIcon className="size-5 rtl:-scale-x-100" />}
              className="size-11 shrink-0 px-0"
            />
          </form>
          <p className="px-3 pb-2 text-center text-[0.6875rem] text-text-muted">{t('disclaimer')}</p>
        </section>
      ) : null}
    </>
  );
}
