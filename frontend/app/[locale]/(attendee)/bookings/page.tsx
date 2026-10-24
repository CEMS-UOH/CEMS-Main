'use client';

// FR-08: the attendee's full booking history, split into upcoming / past / cancelled, with the
// QR ticket (FR-05), cancel before the event starts (FR-07) and feedback after it ends.
// Calls GET /api/attendee/bookings and POST /api/attendee/bookings/:id/cancel.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import PageHeader from '@/components/PageHeader';
import { Link, useRouter } from '@/i18n/navigation';
import { listBookings, type Booking } from '../_lib/attendee-api';
import { useEventDates } from '../_lib/format';
import { canGiveFeedback, groupBookings, type BookingTab } from '../_lib/rules';
import { useSession } from '../_lib/session';
import { FOCUS_RING } from '@/components/styles';
import { useQuery } from '../_lib/useQuery';
import { BookingBadge } from '../_ui/Badges';
import CancelBooking from '../_ui/CancelBooking';
import FeedbackForm, { GivenRating } from '../_ui/FeedbackForm';
import { CalendarIcon, PinIcon, TicketIcon } from '@/components/Icons';
import { EmptyState, ErrorState, LoadingBlock } from '../_ui/States';
import TicketDialog from '../_ui/TicketDialog';

const TABS: BookingTab[] = ['upcoming', 'past', 'cancelled'];

export default function MyBookingsPage() {
  const t = useTranslations('MyBookings');
  const router = useRouter();
  const { session, refresh } = useSession();
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  const query = useQuery(isAttendee ? 'attendee-bookings' : null, () => listBookings());

  const [tab, setTab] = useState<BookingTab>('upcoming');
  const [ticket, setTicket] = useState<Booking | null>(null);
  const [notice, setNotice] = useState(false);

  // Booking history needs a session: guests go to log in (same as the /me page).
  useEffect(() => {
    if (session.status === 'guest') router.replace('/login');
  }, [session.status, router]);

  // The session ended while the page was open: re-check it, which then redirects.
  useEffect(() => {
    if (query.errorStatus === 401) refresh();
  }, [query.errorStatus, refresh]);

  const bookings = query.data?.bookings;
  const groups = useMemo(() => groupBookings(bookings ?? [], new Date()), [bookings]);

  if (session.status !== 'user') return <LoadingBlock label={t('checkingSession')} />;

  if (!isAttendee) {
    return (
      <Card className="mx-auto flex w-full max-w-md flex-col gap-2 text-start">
        <h1 className="type-h2 text-text">{t('attendeesOnlyTitle')}</h1>
        <p className="text-sm text-text-muted">{t('attendeesOnlyBody')}</p>
        <div className="pt-3">
          <Button href="/me" variant="secondary">
            {t('goToAccount')}
          </Button>
        </div>
      </Card>
    );
  }

  function onCancelled(updated: Booking) {
    query.setData((current) => ({
      bookings: (current?.bookings ?? []).map((b) => (b.id === updated.id ? updated : b)),
    }));
    setNotice(true);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {notice ? <FormMessage kind="success">{t('cancelledNotice')}</FormMessage> : null}

      {query.errorCode ? (
        <ErrorState code={query.errorCode} onRetry={query.reload} />
      ) : query.loading || !bookings ? (
        <LoadingBlock />
      ) : (
        <>
          <Tabs tab={tab} onTab={setTab} counts={{ upcoming: groups.upcoming.length, past: groups.past.length, cancelled: groups.cancelled.length }} />

          <div role="tabpanel" id={`bookings-panel-${tab}`} aria-labelledby={`bookings-tab-${tab}`}>
            {groups[tab].length === 0 ? (
              <EmptyState
                title={t(`empty.${tab}`)}
                action={
                  <Button href="/events" variant="secondary">
                    {t('browse')}
                  </Button>
                }
              />
            ) : (
              <ul className="flex flex-col gap-4">
                {groups[tab].map((b) => (
                  <li key={b.id}>
                    <BookingRow
                      booking={b}
                      onShowTicket={() => setTicket(b)}
                      onCancelled={onCancelled}
                      onStale={query.reload}
                      onUnauthenticated={refresh}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <TicketDialog booking={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

function Tabs({
  tab,
  onTab,
  counts,
}: {
  tab: BookingTab;
  onTab: (tab: BookingTab) => void;
  counts: Record<BookingTab, number>;
}) {
  const t = useTranslations('MyBookings.tabs');
  const listRef = useRef<HTMLDivElement>(null);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern); "next" is to the left in Arabic.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const forward = (e.key === 'ArrowRight') !== rtl;
    const next = TABS[(TABS.indexOf(tab) + (forward ? 1 : TABS.length - 1)) % TABS.length];
    onTab(next);
    listRef.current?.querySelector<HTMLButtonElement>(`#bookings-tab-${next}`)?.focus();
    e.preventDefault();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t('label')}
      onKeyDown={onKeyDown}
      className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-card)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((key) => {
        const selected = key === tab;
        return (
          <button
            key={key}
            id={`bookings-tab-${key}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`bookings-panel-${key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onTab(key)}
            className={`flex min-h-10 flex-1 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${FOCUS_RING} ${
              selected ? 'bg-primary text-white' : 'text-text-muted hover:bg-primary-light hover:text-primary-dark'
            }`}
          >
            {t(key)}
            <span
              className={`rounded-full px-2 text-xs tabular-nums ${selected ? 'bg-white/20 text-white' : 'bg-background text-text-muted'}`}
            >
              {counts[key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type RowProps = {
  booking: Booking;
  onShowTicket: () => void;
  onCancelled: (booking: Booking) => void;
  onStale: () => void;
  onUnauthenticated: () => void;
};

function BookingRow({ booking, onShowTicket, onCancelled, onStale, onUnauthenticated }: RowProps) {
  const t = useTranslations('MyBookings');
  const tCommon = useTranslations('AttendeeCommon');
  const dates = useEventDates();
  const [rating, setRating] = useState(false);
  const badge = dates.badge(booking.event.startsAt);
  const now = new Date();

  const eventCancelled = booking.event.status === 'CANCELLED';
  const showTicket =
    booking.status === 'CONFIRMED' && Boolean(booking.qrCode) && !eventCancelled && new Date(booking.event.endsAt) > now;
  // The API's canCancel only looks at the start time; a seat at an event the organizer
  // cancelled has nothing left to cancel.
  const showCancel = booking.canCancel && !eventCancelled;
  const feedbackOpen = canGiveFeedback(booking, now);
  // The attendee API only serves approved events (others are 404), so only those get a link.
  const linkable = booking.event.status === 'APPROVED';

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            aria-hidden
            className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary-light py-2 leading-tight text-primary-dark"
          >
            <span className="text-xl font-bold">{badge.day}</span>
            <span className="text-xs font-medium">{badge.month}</span>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5 text-start">
            <div className="flex flex-wrap items-center gap-2">
              <BookingBadge booking={booking} />
              <span className="text-xs text-text-muted">{booking.event.category.name}</span>
            </div>
            {linkable ? (
              <Link
                href={`/events/${booking.event.id}`}
                className={`type-h3 w-fit rounded-sm text-text underline-offset-4 transition-colors duration-150 hover:text-primary hover:underline ${FOCUS_RING}`}
              >
                {booking.event.title}
              </Link>
            ) : (
              <p className="type-h3 text-text">{booking.event.title}</p>
            )}
            <p className="flex items-start gap-2 text-sm text-text-muted">
              <CalendarIcon className="mt-0.5 size-4 shrink-0" />
              <span className="sr-only">{tCommon('when')}</span>
              {dates.range(booking.event.startsAt, booking.event.endsAt)}
            </p>
            {booking.event.venue ? (
              <p className="flex items-start gap-2 text-sm text-text-muted">
                <PinIcon className="mt-0.5 size-4 shrink-0" />
                <span className="sr-only">{tCommon('where')}</span>
                {booking.event.venue.name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2 sm:shrink-0 sm:flex-col sm:items-end">
          {showTicket ? (
            <Button type="button" size="sm" icon={<TicketIcon />} onClick={onShowTicket}>
              {t('showTicket')}
            </Button>
          ) : null}
          {showCancel ? (
            <CancelBooking
              bookingId={booking.id}
              onCancelled={onCancelled}
              onStale={onStale}
              onUnauthenticated={onUnauthenticated}
            />
          ) : null}
          {feedbackOpen && booking.myRating ? (
            <GivenRating rating={booking.myRating} />
          ) : feedbackOpen && !rating ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => setRating(true)}>
              {t('rate')}
            </Button>
          ) : null}
        </div>
      </div>

      {feedbackOpen && rating && !booking.myRating ? (
        <div className="border-t border-border pt-4">
          <FeedbackForm eventId={booking.event.id} idPrefix={`booking-${booking.id}`} />
        </div>
      ) : null}
    </Card>
  );
}
