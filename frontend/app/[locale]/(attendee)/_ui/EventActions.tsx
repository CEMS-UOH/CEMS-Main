'use client';

// "Add to my calendar" and "Share" on the event page (FR-09). Both are built in the browser:
// the calendar entry is an .ics file made from the event (calendar.ts) or a pre-filled Google
// Calendar link; sharing uses the phone's own share sheet when there is one, otherwise a
// short list (copy link, WhatsApp, email). Nothing is sent to our API.
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarPlusIcon, CheckIcon, DownloadIcon, GlobeIcon, LinkIcon, MailIcon, SendIcon, ShareIcon } from '@/components/Icons';
import { FOCUS_RING } from '@/components/styles';
import { copyText, downloadFile, safeFileName } from '@/lib/download';
import type { EventDetails } from '../_lib/attendee-api';
import { googleCalendarUrl, toIcs } from '../_lib/calendar';

type Open = 'calendar' | 'share' | null;

/** The same outlined button as the "Save" heart beside it. */
const TRIGGER = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ${FOCUS_RING}`;
const TRIGGER_IDLE = 'border-border bg-surface text-text hover:border-primary/40 hover:bg-primary-light';
const TRIGGER_OPEN = 'border-primary/40 bg-primary-light text-primary-dark';

export default function EventActions({ event, ended }: { event: EventDetails; ended: boolean }) {
  const t = useTranslations('EventActions');
  const locale = useLocale();
  const [open, setOpen] = useState<Open>(null);
  const [copied, setCopied] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // The address is only known in the browser (it differs between local, staging and live).
  useEffect(() => setPageUrl(`${window.location.origin}/${locale}/events/${event.id}`), [locale, event.id]);

  // Escape or a click elsewhere closes the open list, and focus goes back to its button.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      rootRef.current?.querySelector<HTMLButtonElement>(`[data-trigger="${open}"]`)?.focus();
      setOpen(null);
    }
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(null);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const calendarEvent = {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.venue ? [event.venue.name, event.venue.building].filter(Boolean).join(' - ') : null,
    url: pageUrl,
  };

  async function onShare() {
    // Phones (and some desktops) have a share sheet: use it straight away.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: event.title, text: t('shareText', { title: event.title }), url: pageUrl });
      } catch {
        // Closed without sharing - nothing to do.
      }
      return;
    }
    setOpen(open === 'share' ? null : 'share');
  }

  async function onCopy() {
    if (await copyText(pageUrl)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const shareMessage = `${t('shareText', { title: event.title })}\n${pageUrl}`;

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div className={`grid gap-2 ${ended ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {/* A past event has no use in a calendar. */}
        {ended ? null : (
          <button
            type="button"
            data-trigger="calendar"
            aria-expanded={open === 'calendar'}
            aria-controls={`${panelId}-calendar`}
            onClick={() => setOpen(open === 'calendar' ? null : 'calendar')}
            className={`${TRIGGER} ${open === 'calendar' ? TRIGGER_OPEN : TRIGGER_IDLE}`}
          >
            <CalendarPlusIcon className="size-5" />
            {t('addToCalendar')}
          </button>
        )}
        <button
          type="button"
          data-trigger="share"
          aria-expanded={open === 'share'}
          aria-controls={`${panelId}-share`}
          onClick={onShare}
          className={`${TRIGGER} ${open === 'share' ? TRIGGER_OPEN : TRIGGER_IDLE}`}
        >
          <ShareIcon className="size-5" />
          {t('share')}
        </button>
      </div>

      {open === 'calendar' ? (
        <Panel id={`${panelId}-calendar`} label={t('addToCalendar')}>
          <PanelLink href={googleCalendarUrl(calendarEvent)} icon={<GlobeIcon className="size-5" />} hint={t('googleHint')}>
            {t('google')}
          </PanelLink>
          <PanelButton
            icon={<DownloadIcon className="size-5" />}
            hint={t('icsHint')}
            onClick={() => {
              downloadFile(`${safeFileName(event.title)}.ics`, toIcs(calendarEvent), 'text/calendar;charset=utf-8');
              setOpen(null);
            }}
          >
            {t('ics')}
          </PanelButton>
        </Panel>
      ) : null}

      {open === 'share' ? (
        <Panel id={`${panelId}-share`} label={t('share')}>
          <PanelButton icon={copied ? <CheckIcon className="size-5 text-success" /> : <LinkIcon className="size-5" />} onClick={onCopy}>
            <span aria-live="polite">{copied ? t('copied') : t('copyLink')}</span>
          </PanelButton>
          <PanelLink href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} icon={<SendIcon className="size-5" />}>
            {t('whatsapp')}
          </PanelLink>
          <PanelLink
            href={`mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(shareMessage)}`}
            icon={<MailIcon className="size-5" />}
            newTab={false}
          >
            {t('email')}
          </PanelLink>
        </Panel>
      ) : null}
    </div>
  );
}

function Panel({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      className="flex animate-fade-in flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]"
    >
      {children}
    </div>
  );
}

const ROW = `flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 text-start text-sm text-text transition-colors duration-150 last:border-b-0 hover:bg-primary-light hover:text-primary-dark ${FOCUS_RING} focus-visible:-outline-offset-2`;

function RowBody({ icon, hint, children }: { icon: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <>
      <span className="shrink-0 text-primary">{icon}</span>
      <span className="flex flex-col">
        <span className="font-medium">{children}</span>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </span>
    </>
  );
}

function PanelButton(props: { icon: ReactNode; hint?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={props.onClick} className={ROW}>
      <RowBody icon={props.icon} hint={props.hint}>
        {props.children}
      </RowBody>
    </button>
  );
}

function PanelLink(props: { href: string; icon: ReactNode; hint?: string; newTab?: boolean; children: ReactNode }) {
  const newTab = props.newTab ?? true;
  return (
    <a
      href={props.href}
      className={ROW}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <RowBody icon={props.icon} hint={props.hint}>
        {props.children}
      </RowBody>
    </a>
  );
}
