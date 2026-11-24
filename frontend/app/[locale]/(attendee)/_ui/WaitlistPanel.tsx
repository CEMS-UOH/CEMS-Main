'use client';

// What the booking panel shows for a full event: instead of a dead "Full" button, a way to
// wait for a seat. A freed seat is booked for the first person waiting automatically (see
// backend attendee/waitlist.service.js) and they are notified, so nobody has to keep checking.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import FormMessage from '@/components/FormMessage';
import { QueueIcon } from '@/components/Icons';
import { TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import { joinWaitlist, leaveWaitlist, listMyWaitlist } from '../_lib/attendee-api';
import { useSession } from '../_lib/session';
import { useAttendeeError } from '../_lib/useAttendeeError';
import { useQuery } from '../_lib/useQuery';

type Props = {
  eventId: string;
  /** A seat turned out to be free after all (or the event changed): reload the event. */
  onStale: () => void;
};

export default function WaitlistPanel({ eventId, onStale }: Props) {
  const t = useTranslations('Waitlist');
  const errorMessage = useAttendeeError();
  const { session, user } = useSession();
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  const query = useQuery(isAttendee && user ? `waitlist:${user.id}` : null, listMyWaitlist);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const place = query.data?.waitlist.find((entry) => entry.eventId === eventId) ?? null;
  const NOTE = 'text-start text-sm text-text-muted';

  if (session.status === 'guest') {
    return (
      <div className="flex flex-col gap-3 text-start">
        <p className="text-sm font-medium text-text">{t('fullTitle')}</p>
        <p className={NOTE}>{t('guestHint')}</p>
        <Button href="/login" variant="secondary" className="w-full">
          {t('loginToJoin')}
        </Button>
      </div>
    );
  }
  if (!isAttendee) {
    return <p className={NOTE}>{t('fullTitle')}</p>;
  }

  async function onJoin() {
    setBusy(true);
    setError(null);
    const result = await joinWaitlist(eventId);
    setBusy(false);
    if (result.ok || result.code === 'ALREADY_WAITLISTED') {
      query.reload();
      return;
    }
    setError(errorMessage(result.code));
    if (result.code === 'EVENT_NOT_FULL' || result.code === 'ALREADY_BOOKED') onStale();
  }

  async function onLeave() {
    setBusy(true);
    setError(null);
    const result = await leaveWaitlist(eventId);
    setBusy(false);
    if (!result.ok && result.code !== 'NOT_ON_WAITLIST') {
      setError(errorMessage(result.code));
      return;
    }
    query.reload();
  }

  if (query.loading && !query.data) {
    return (
      <Button type="button" loading className="w-full">
        {t('checking')}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-start">
      {place ? (
        <>
          <div className="flex items-center gap-3 rounded-lg bg-primary-light px-4 py-3">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-on-fill tabular-nums"
            >
              {place.position}
            </span>
            <p className="text-sm font-medium text-primary-dark">
              {t('yourPlace', { position: place.position })}
            </p>
          </div>
          <p className={NOTE}>{t('howItWorks')}</p>
          <Button type="button" variant="ghost" onClick={onLeave} loading={busy} className="w-full">
            {t('leave')}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-text">{t('fullTitle')}</p>
          <p className={NOTE}>{t('joinHint')}</p>
          <Button type="button" icon={<QueueIcon />} onClick={onJoin} loading={busy} className="w-full">
            {busy ? t('joining') : t('join')}
          </Button>
        </>
      )}
      {error ? <FormMessage kind="error">{error}</FormMessage> : null}
      <Link href="/bookings" className={`w-fit text-sm ${TEXT_LINK}`}>
        {t('seeAll')}
      </Link>
    </div>
  );
}
