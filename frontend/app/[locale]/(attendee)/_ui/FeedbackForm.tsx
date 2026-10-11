'use client';

// Rate an event after attending: 1-5 stars and an optional comment.
// The API route is proposed, not built yet (see submitFeedback in attendee-api.ts); until it
// exists the API answers NOT_FOUND and the form says rating is not available yet.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import FormMessage from '@/components/FormMessage';
import { FEEDBACK_COMMENT_MAX, submitFeedback } from '../_lib/attendee-api';
import { LABEL, TEXTAREA } from '@/components/FormField';
import { useAttendeeError } from '../_lib/useAttendeeError';
import { StarIcon } from '@/components/Icons';

type Props = {
  eventId: string;
  /** Unique per form on the page, for label/input ids. */
  idPrefix: string;
  onSubmitted?: () => void;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export default function FeedbackForm({ eventId, idPrefix, onSubmitted }: Props) {
  const t = useTranslations('Feedback');
  const errorMessage = useAttendeeError();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'thanks' | 'already' | null>(null);

  if (done) {
    return <FormMessage kind="success">{t(done)}</FormMessage>;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError(t('pickRating'));
      return;
    }
    setBusy(true);
    setError(null);
    const trimmed = comment.trim();
    const result = await submitFeedback(eventId, { rating, ...(trimmed ? { comment: trimmed } : {}) });
    setBusy(false);
    if (result.ok) {
      setDone('thanks');
      onSubmitted?.();
      return;
    }
    if (result.code === 'ALREADY_REVIEWED') {
      setDone('already');
      return;
    }
    setError(result.code === 'NOT_FOUND' ? t('unavailable') : errorMessage(result.code));
  }

  const shown = hovered || rating;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 text-start">
      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2 ${LABEL}`}>{t('ratingLabel')}</legend>
        <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {RATINGS.map((value) => (
            <label
              key={value}
              onMouseEnter={() => setHovered(value)}
              className="cursor-pointer rounded-md p-0.5 text-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            >
              <input
                type="radio"
                name={`${idPrefix}-rating`}
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                disabled={busy}
                className="sr-only"
              />
              <StarIcon filled={value <= shown} className="size-8" />
              <span className="sr-only">{t('stars', { count: value })}</span>
            </label>
          ))}
          {shown ? <span className="ms-2 text-sm text-text-muted">{t(`scale.${shown}`)}</span> : null}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idPrefix}-comment`} className={LABEL}>
          {t('commentLabel')}
        </label>
        <textarea
          id={`${idPrefix}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={FEEDBACK_COMMENT_MAX}
          rows={3}
          disabled={busy}
          placeholder={t('commentPlaceholder')}
          aria-describedby={`${idPrefix}-comment-count`}
          className={TEXTAREA}
        />
        <p id={`${idPrefix}-comment-count`} className="text-end text-xs text-text-muted">
          {t('characters', { count: comment.length, max: FEEDBACK_COMMENT_MAX })}
        </p>
      </div>

      {error ? <FormMessage kind="error">{error}</FormMessage> : null}

      <div>
        <Button type="submit" loading={busy}>
          {busy ? t('submitting') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
