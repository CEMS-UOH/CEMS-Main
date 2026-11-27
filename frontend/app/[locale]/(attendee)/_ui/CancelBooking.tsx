'use client';

// FR-07: cancel a booking before the event starts. Two steps, inline: the first click only asks,
// the red button appears at the moment of commitment. Focus follows the swap both ways.
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import FormMessage from '@/components/FormMessage';
import { cancelBooking, type Booking } from '../_lib/attendee-api';
import { useAttendeeError } from '../_lib/useAttendeeError';

type Props = {
  bookingId: string;
  onCancelled: (booking: Booking) => void;
  /** The API said the booking can no longer be cancelled (or is gone): reload the truth. */
  onStale?: () => void;
  /** A 401: the session ended while the page was open. */
  onUnauthenticated?: () => void;
};

const STALE_CODES = ['ALREADY_CANCELLED', 'CANCELLATION_CLOSED', 'BOOKING_NOT_FOUND'];

export default function CancelBooking({ bookingId, onCancelled, onStale, onUnauthenticated }: Props) {
  const t = useTranslations('Booking');
  const errorMessage = useAttendeeError();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasAsked = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (asking) {
      hasAsked.current = true;
      // The safe choice gets focus, so pressing Enter right away never cancels.
      root.querySelector<HTMLButtonElement>('[data-keep]')?.focus();
    } else if (hasAsked.current) {
      root.querySelector<HTMLButtonElement>('[data-trigger]')?.focus();
    }
  }, [asking]);

  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await cancelBooking(bookingId);
    setBusy(false);
    if (result.ok) {
      setAsking(false);
      onCancelled(result.data.booking);
      return;
    }
    if (result.status === 401) onUnauthenticated?.();
    if (STALE_CODES.includes(result.code)) onStale?.();
    setError(errorMessage(result.code));
    setAsking(false);
  }

  return (
    <div ref={rootRef} className="flex flex-col gap-2">
      <div
        role={asking ? 'group' : undefined}
        aria-label={asking ? t('cancelQuestion') : undefined}
        className="flex flex-wrap items-center gap-2"
      >
        {asking ? (
          <>
            <span className="text-sm text-text">{t('cancelQuestion')}</span>
            <Button type="button" variant="danger" size="sm" loading={busy} onClick={confirm}>
              {busy ? t('cancelling') : t('confirmCancel')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              data-keep
              onClick={() => setAsking(false)}
            >
              {t('keep')}
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm" data-trigger onClick={() => setAsking(true)}>
            {t('cancel')}
          </Button>
        )}
      </div>
      {error ? <FormMessage kind="error">{error}</FormMessage> : null}
    </div>
  );
}
