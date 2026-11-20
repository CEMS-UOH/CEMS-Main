'use client';

// FR-09 (event details), FR-05 (book a seat + QR ticket), FR-07 (cancel) and feedback after the
// event. Calls GET /api/attendee/events/:id, GET /api/attendee/bookings, POST /bookings and
// POST /bookings/:id/cancel.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import { Link } from '@/i18n/navigation';
import { bookEvent, getEvent, listBookings, type Booking, type EventDetails } from '../../_lib/attendee-api';
import { useEventDates } from '../../_lib/format';
import { bookingAction, findBookingForEvent, seatsTone, type BookingAction } from '../../_lib/rules';
import { useSession } from '../../_lib/session';
import { TEXT_LINK } from '@/components/styles';
import { useAttendeeError } from '../../_lib/useAttendeeError';
import { useQuery } from '../../_lib/useQuery';
import { CategoryBadge, SeatsBadge } from '../../_ui/Badges';
import CancelBooking from '../../_ui/CancelBooking';
import EventImage from '../../_ui/EventImage';
import FeedbackForm, { GivenRating } from '../../_ui/FeedbackForm';
import { BackIcon, CalendarIcon, CheckIcon, PaperclipIcon, PinIcon, SeatIcon, TicketIcon, UserIcon } from '@/components/Icons';
import { EmptyState, ErrorState, LoadingBlock } from '../../_ui/States';
import TicketDialog from '../../_ui/TicketDialog';

const RELOAD_EVENT_CODES = ['EVENT_FULL', 'BOOKING_CLOSED', 'EVENT_NOT_FOUND'];

export default function EventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('EventDetails');
  const errorMessage = useAttendeeError();
  const { session, refresh } = useSession();

  const eventQuery = useQuery(`attendee-event:${id}`, () => getEvent(id));
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  // Only an Attendee has bookings; for anyone else the key stays null and nothing is fetched.
  const bookingsQuery = useQuery(isAttendee ? 'attendee-bookings' : null, () => listBookings());

  const [booking, setBooking] = useState<{ busy: boolean; error: string | null; notice: 'booked' | 'cancelled' | null }>({
    busy: false,
    error: null,
    notice: null,
  });
  const [ticket, setTicket] = useState<Booking | null>(null);

  const backLink = (
    <Link href="/events" className={`flex w-fit items-center gap-1.5 text-sm ${TEXT_LINK}`}>
      <BackIcon />
      {t('back')}
    </Link>
  );

  if (eventQuery.errorCode === 'EVENT_NOT_FOUND') {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title={t('notFoundTitle')}
          body={t('notFoundBody')}
          action={
            <Button href="/events" variant="secondary">
              {t('browse')}
            </Button>
          }
        />
      </div>
    );
  }

  if (eventQuery.errorCode) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <ErrorState code={eventQuery.errorCode} onRetry={eventQuery.reload} />
      </div>
    );
  }

  const event = eventQuery.data?.event;
  if (!event) {
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <LoadingBlock label={t('loading')} />
      </div>
    );
  }

  const myBooking = isAttendee ? findBookingForEvent(bookingsQuery.data?.bookings ?? [], event.id) : null;
  const waitingForBookings = isAttendee && bookingsQuery.loading;
  const action: BookingAction = bookingAction(
    event,
    myBooking,
    waitingForBookings ? { status: 'loading' } : session,
    new Date()
  );
  // While the bookings load we cannot tell "full" from "you already have a seat".
  const shownAction: BookingAction = waitingForBookings && action === 'full' ? 'loading' : action;

  async function onBook() {
    setBooking({ busy: true, error: null, notice: null });
    const result = await bookEvent(id);
    if (result.ok) {
      const created = result.data.booking;
      bookingsQuery.setData((current) => ({
        // Re-booking after a cancel reuses the same booking row, so replace it by id.
        bookings: [created, ...(current?.bookings ?? []).filter((b) => b.id !== created.id)],
      }));
      setBooking({ busy: false, error: null, notice: 'booked' });
      setTicket(created);
      eventQuery.reload(); // fresh seat counts
      return;
    }
    if (result.status === 401) refresh();
    if (result.code === 'ALREADY_BOOKED') bookingsQuery.reload();
    if (RELOAD_EVENT_CODES.includes(result.code)) eventQuery.reload();
    setBooking({ busy: false, error: errorMessage(result.code), notice: null });
  }

  function onCancelled(updated: Booking) {
    bookingsQuery.setData((current) => ({
      bookings: (current?.bookings ?? []).map((b) => (b.id === updated.id ? updated : b)),
    }));
    setBooking({ busy: false, error: null, notice: 'cancelled' });
    eventQuery.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      {backLink}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex flex-col gap-5 lg:col-start-1">
          <EventImage
            src={event.imageUrl}
            alt={t('imageAlt', { title: event.title })}
            eager
            className="aspect-[16/9] w-full rounded-lg border border-border shadow-[var(--shadow-card)]"
          />
          <header className="flex flex-col gap-3 text-start">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge name={event.category.name} />
              <SeatsBadge event={event} />
            </div>
            <h1 className="type-h1 text-text [overflow-wrap:anywhere]">{event.title}</h1>
            <p className="flex items-center gap-2 text-sm text-text-muted">
              <UserIcon />
              {t('organizedBy', { name: event.organizer.fullName })}
            </p>
          </header>
        </div>

        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <Card className="flex flex-col gap-5">
            <EventFacts event={event} />
            <div className="border-t border-border pt-5">
              <BookingPanel
                action={shownAction}
                booking={myBooking}
                busy={booking.busy}
                onBook={onBook}
                onShowTicket={() => myBooking && setTicket(myBooking)}
                onCancelled={onCancelled}
                onStale={() => {
                  bookingsQuery.reload();
                  eventQuery.reload();
                }}
                onUnauthenticated={refresh}
              />
              {booking.notice ? (
                <div className="mt-4">
                  <FormMessage kind="success">{t(`notice.${booking.notice}`)}</FormMessage>
                </div>
              ) : null}
              {booking.error ? (
                <div className="mt-4">
                  <FormMessage kind="error">{booking.error}</FormMessage>
                </div>
              ) : null}
            </div>
          </Card>
        </aside>

        <div className="flex flex-col gap-6 lg:col-start-1">
          <section aria-labelledby="about-title" className="flex flex-col gap-3 text-start">
            <h2 id="about-title" className="type-h2 text-text">
              {t('about')}
            </h2>
            <p className="max-w-prose whitespace-pre-line text-base text-text">{event.description}</p>
          </section>

          {event.attachments.length > 0 ? (
            <section aria-labelledby="attachments-title" className="flex flex-col gap-3 text-start">
              <h2 id="attachments-title" className="type-h2 text-text">
                {t('attachments')}
              </h2>
              <ul className="flex flex-col gap-2">
                {event.attachments.map((url, i) => (
                  <li key={url}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex w-fit items-center gap-2 text-sm ${TEXT_LINK}`}
                    >
                      <PaperclipIcon />
                      {t('attachment', { number: i + 1 })}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <TicketDialog booking={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

function EventFacts({ event }: { event: EventDetails }) {
  const t = useTranslations('EventDetails');
  const dates = useEventDates();
  const tone = seatsTone(event);
  const percent = event.capacity > 0 ? Math.min(100, Math.round((event.seatsTaken / event.capacity) * 100)) : 100;

  return (
    <dl className="flex flex-col gap-4 text-start text-sm">
      <div className="flex items-start gap-3">
        <dt className="mt-0.5 text-primary">
          <CalendarIcon className="size-5" />
          <span className="sr-only">{t('when')}</span>
        </dt>
        <dd className="flex flex-col">
          <span className="font-medium text-text">{dates.day(event.startsAt)}</span>
          <span className="text-text-muted">{dates.hours(event.startsAt, event.endsAt)}</span>
        </dd>
      </div>

      <div className="flex items-start gap-3">
        <dt className="mt-0.5 text-primary">
          <PinIcon className="size-5" />
          <span className="sr-only">{t('where')}</span>
        </dt>
        <dd className="flex flex-col">
          {event.venue ? (
            <>
              <span className="font-medium text-text">{event.venue.name}</span>
              {event.venue.building ? <span className="text-text-muted">{event.venue.building}</span> : null}
              {event.venue.location ? <span className="text-text-muted">{event.venue.location}</span> : null}
            </>
          ) : (
            <span className="text-text-muted">{t('venueTbd')}</span>
          )}
        </dd>
      </div>

      <div className="flex items-start gap-3">
        <dt className="mt-0.5 text-primary">
          <SeatIcon className="size-5" />
          <span className="sr-only">{t('seats')}</span>
        </dt>
        <dd className="flex flex-1 flex-col gap-2">
          <span className="font-medium text-text">
            {t('seatsTaken', { taken: event.seatsTaken, capacity: event.capacity })}
          </span>
          <span aria-hidden className="h-2 w-full overflow-hidden rounded-lg bg-background">
            <span
              className={`block h-full rounded-lg transition-[width] duration-300 ${tone === 'full' ? 'bg-danger' : tone === 'low' ? 'bg-accent' : 'bg-primary'}`}
              style={{ width: `${percent}%` }}
            />
          </span>
        </dd>
      </div>
    </dl>
  );
}

type PanelProps = {
  action: BookingAction;
  booking: Booking | null;
  busy: boolean;
  onBook: () => void;
  onShowTicket: () => void;
  onCancelled: (booking: Booking) => void;
  onStale: () => void;
  onUnauthenticated: () => void;
};

function BookingPanel({ action, booking, busy, onBook, onShowTicket, onCancelled, onStale, onUnauthenticated }: PanelProps) {
  const t = useTranslations('Booking');
  const { id } = useParams<{ id: string }>();
  const NOTE = 'text-start text-sm text-text-muted';

  switch (action) {
    case 'loading':
      return (
        <Button type="button" loading className="w-full">
          {t('checking')}
        </Button>
      );

    case 'can-book':
      return (
        <Button type="button" icon={<TicketIcon />} onClick={onBook} loading={busy} className="w-full">
          {busy ? t('booking') : t('book')}
        </Button>
      );

    case 'booked':
      return (
        <div className="flex flex-col gap-3 text-start">
          <p className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckIcon />
            {t('youHaveASeat')}
          </p>
          <Button type="button" icon={<TicketIcon />} onClick={onShowTicket} className="w-full">
            {t('showTicket')}
          </Button>
          {booking?.canCancel ? (
            <CancelBooking
              bookingId={booking.id}
              onCancelled={onCancelled}
              onStale={onStale}
              onUnauthenticated={onUnauthenticated}
            />
          ) : (
            <p className={NOTE}>{t('cancelClosed')}</p>
          )}
        </div>
      );

    case 'started':
      return <p className={NOTE}>{t('started')}</p>;

    case 'full':
      return (
        <div className="flex flex-col gap-2">
          <Button type="button" disabled className="w-full">
            {t('full')}
          </Button>
          <p className={NOTE}>{t('fullHint')}</p>
        </div>
      );

    case 'guest':
      return (
        <div className="flex flex-col gap-3 text-start">
          <p className={NOTE}>{t('loginToBook')}</p>
          <Button href="/login" className="w-full">
            {t('login')}
          </Button>
          <p className="text-center text-sm">
            <span className="me-1 text-text-muted">{t('noAccount')}</span>
            <Link href="/register" className={TEXT_LINK}>
              {t('register')}
            </Link>
          </p>
        </div>
      );

    case 'not-attendee':
      return <p className={NOTE}>{t('attendeesOnly')}</p>;

    case 'ended':
      return (
        <div className="flex flex-col gap-4 text-start">
          <p className={NOTE}>{t('ended')}</p>
          {booking ? (
            <div className="flex flex-col gap-3">
              <h2 className="type-h3 text-text">{t('rateTitle')}</h2>
              {booking.myRating ? (
                <GivenRating rating={booking.myRating} />
              ) : (
                <FeedbackForm eventId={id} idPrefix={`event-${id}`} />
              )}
            </div>
          ) : null}
        </div>
      );
  }
}
