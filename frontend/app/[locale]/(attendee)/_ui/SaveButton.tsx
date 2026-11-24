'use client';

// The heart that saves an event for later. Shown only to a signed-in Attendee (useSaved()
// is null for everyone else). A real toggle button: aria-pressed says whether it is saved.
import { useTranslations } from 'next-intl';
import { HeartIcon } from '@/components/Icons';
import { FOCUS_RING } from '@/components/styles';
import { useSaved } from '../_lib/saved';

type Props = {
  eventId: string;
  eventTitle: string;
  /** `overlay`: a round chip over a card's picture. `inline`: a labelled button on the event page. */
  variant?: 'overlay' | 'inline';
};

export default function SaveButton({ eventId, eventTitle, variant = 'overlay' }: Props) {
  const t = useTranslations('Saved');
  const saved = useSaved();
  if (!saved) return null;
  const isSaved = saved.isSaved(eventId);

  const heart = (
    // A fresh key on every change replays the pop, so the press is felt.
    <span key={String(isSaved)} className={isSaved ? 'animate-pop text-danger' : ''}>
      <HeartIcon filled={isSaved} className="size-5" />
    </span>
  );

  if (variant === 'inline') {
    return (
      <button
        type="button"
        aria-pressed={isSaved}
        onClick={() => saved.toggle(eventId)}
        className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors duration-150 ${
          isSaved
            ? 'border-danger/30 bg-danger-light text-danger'
            : 'border-border bg-surface text-text hover:border-primary/40 hover:bg-primary-light'
        } ${FOCUS_RING}`}
      >
        {heart}
        {isSaved ? t('saved') : t('save')}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? t('unsaveLabel', { title: eventTitle }) : t('saveLabel', { title: eventTitle })}
      onClick={(e) => {
        // The card around it is a link: saving must not also open the event.
        e.preventDefault();
        e.stopPropagation();
        saved.toggle(eventId);
      }}
      className={`grid size-10 cursor-pointer place-items-center rounded-full bg-surface/95 text-text shadow-[var(--shadow-card)] backdrop-blur-sm transition-[transform,background-color] duration-150 ease-[var(--ease-out-expo)] hover:scale-105 hover:bg-surface active:scale-95 ${FOCUS_RING}`}
    >
      {heart}
    </button>
  );
}
