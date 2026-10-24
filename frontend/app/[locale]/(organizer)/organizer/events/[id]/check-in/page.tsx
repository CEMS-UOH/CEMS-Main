'use client';

// FR-14: the door. The organizer scans each attendee's ticket QR (or types its code) and sees
// at once whether that person is in, already in, or not on this event's list.
// Calls GET /api/organizer/events/:id, GET /api/organizer/events/:id/attendees (for the
// running count) and POST /api/organizer/events/:id/check-in.
import { useCallback, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { TextField } from '@/components/FormField';
import { AlertIcon, BackIcon, CheckIcon, UsersIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import { TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import { CAMPUS_TIME_ZONE } from '../../../../../_dashboard/lib/campusTime';
import { bothOk, useApiQuery } from '../../../../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../../../../_dashboard/lib/useDashboardError';
import { EmptyState, ErrorState, LoadingState } from '../../../../../_dashboard/ui/States';
import { checkInByCode, getMyEvent, listAttendees } from '../../../../_lib/organizer-api';
import QrScanner from '../../../../_ui/QrScanner';

// How long a result stays on screen before the scanner reads the next ticket.
const RESULT_HOLD_MS = 1600;
// The same QR held in front of the camera is ignored for this long, so one ticket is sent once.
const SAME_CODE_MS = 5000;

type Outcome =
  | { kind: 'in'; name: string }
  | { kind: 'already'; name: string; at: string }
  | { kind: 'error'; message: string };

export default function CheckInPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Organizer.checkIn');
  const tNav = useTranslations('Organizer');
  const format = useFormatter();
  const errorMessage = useDashboardError();

  const query = useApiQuery(`organizer-checkin:${id}`, async () =>
    bothOk(...(await Promise.all([getMyEvent(id), listAttendees(id, { status: 'CONFIRMED', limit: 1 })])))
  );

  const [busy, setBusy] = useState(false);
  const [holding, setHolding] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [code, setCode] = useState('');
  const last = useRef<{ code: string; at: number } | null>(null);

  const send = useCallback(
    async (raw: string) => {
      // A typed code may be copied with the spaces the ticket shows between groups.
      const value = raw.replace(/\s+/g, '');
      if (!value || busy) return;
      setBusy(true);
      const result = await checkInByCode(id, value);
      setBusy(false);

      if (result.ok) {
        const { attendee, alreadyCheckedIn } = result.data;
        if (alreadyCheckedIn && attendee.checkedInAt) {
          setOutcome({
            kind: 'already',
            name: attendee.user.fullName,
            at: format.dateTime(new Date(attendee.checkedInAt), {
              timeStyle: 'short',
              timeZone: CAMPUS_TIME_ZONE,
            }),
          });
        } else {
          setOutcome({ kind: 'in', name: attendee.user.fullName });
          // A short buzz on phones that support it, so the door does not have to look down.
          navigator.vibrate?.(80);
        }
        query.reload();
      } else {
        setOutcome({ kind: 'error', message: errorMessage(result.code) });
      }

      // Hold the result briefly before the camera reads the next ticket.
      setHolding(true);
      setTimeout(() => setHolding(false), RESULT_HOLD_MS);
    },
    [busy, id, format, errorMessage, query]
  );

  const onScan = useCallback(
    (value: string) => {
      const now = Date.now();
      if (last.current && last.current.code === value && now - last.current.at < SAME_CODE_MS) return;
      last.current = { code: value, at: now };
      send(value);
    },
    [send]
  );

  const backLink = (
    <Link href={`/organizer/events/${id}/attendees`} className={`flex w-fit items-center gap-1.5 ${TEXT_LINK}`}>
      <BackIcon />
      {t('backToAttendees')}
    </Link>
  );

  if (query.loading) {
    return (
      <>
        <PageHeader title={t('title')} eyebrow={backLink} />
        <LoadingState />
      </>
    );
  }

  if (query.errorCode || !query.data) {
    return (
      <>
        <PageHeader title={t('title')} eyebrow={backLink} />
        <ErrorState code={query.errorCode ?? 'UNKNOWN'} onRetry={query.reload} />
      </>
    );
  }

  const [{ event }, { summary }] = query.data;
  const open = event.status === 'APPROVED' && new Date(event.endsAt) > new Date();

  if (!open) {
    return (
      <>
        <PageHeader title={t('title')} subtitle={event.title} eyebrow={backLink} />
        <EmptyState
          title={t('closedTitle')}
          body={event.status === 'APPROVED' ? t('closedEnded') : t('closedNotApproved')}
          action={
            <Button href="/organizer" variant="secondary">
              {tNav('backToEvents')}
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={event.title} eyebrow={backLink} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-4">
          <h2 className="type-h3 text-start text-text">{t('scanTitle')}</h2>
          <QrScanner onCode={onScan} paused={busy || holding} />
        </Card>

        <div className="flex flex-col gap-6">
          {/* The running count for the door. */}
          <Card className="flex items-center gap-4">
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
              <UsersIcon className="size-6" />
            </span>
            <div className="flex flex-col gap-0.5 text-start">
              <p className="type-h2 text-text tabular-nums">
                {t('count', { checkedIn: summary.checkedIn, confirmed: summary.confirmed })}
              </p>
              <p className="text-sm text-text-muted">{t('countLabel')}</p>
            </div>
          </Card>

          {/* The last result, announced to screen readers as it changes. */}
          <div aria-live="assertive" aria-atomic="true" className="empty:hidden">
            {outcome ? <OutcomeCard outcome={outcome} /> : null}
          </div>

          <Card>
            <form
              className="flex flex-col gap-3 text-start"
              onSubmit={(e) => {
                e.preventDefault();
                last.current = null;
                send(code).then(() => setCode(''));
              }}
            >
              <h2 className="type-h3 text-text">{t('manualTitle')}</h2>
              <p className="text-sm text-text-muted">{t('manualBody')}</p>
              <TextField
                id="ticket-code"
                label={t('codeLabel')}
                value={code}
                onChange={setCode}
                autoComplete="off"
                maxLength={64}
                ltrValue
                disabled={busy}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={busy} disabled={!code.trim()} icon={<CheckIcon />}>
                  {t('checkInButton')}
                </Button>
                <Link href={`/organizer/events/${id}/attendees`} className={`text-sm ${TEXT_LINK}`}>
                  {t('useList')}
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  const t = useTranslations('Organizer.checkIn');

  const look =
    outcome.kind === 'in'
      ? { box: 'border-success/40 bg-success-light', mark: 'bg-success text-white', icon: <CheckIcon className="size-6" /> }
      : outcome.kind === 'already'
        ? { box: 'border-accent/50 bg-accent-light', mark: 'bg-accent text-white', icon: <AlertIcon className="size-6" /> }
        : { box: 'border-danger/40 bg-danger-light', mark: 'bg-danger text-white', icon: <AlertIcon className="size-6" /> };

  return (
    <div className={`flex animate-rise items-center gap-4 rounded-lg border p-5 text-start ${look.box}`}>
      <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-full ${look.mark}`}>
        {look.icon}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        {outcome.kind === 'error' ? (
          <>
            <p className="text-base font-bold text-danger">{t('resultError')}</p>
            <p className="text-sm text-text">{outcome.message}</p>
          </>
        ) : (
          <>
            <p className="type-h3 text-text [overflow-wrap:anywhere]">{outcome.name}</p>
            <p className={`text-sm font-medium ${outcome.kind === 'in' ? 'text-success' : 'text-accent-dark'}`}>
              {outcome.kind === 'in' ? t('resultIn') : t('resultAlready', { time: outcome.at })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
