'use client';

// Small status pills used on cards, the event page and "My bookings".
import { useTranslations } from 'next-intl';
import type { AttendeeEvent, Booking } from '../_lib/attendee-api';
import { seatsTone } from '../_lib/rules';
import { SeatIcon } from './Icons';

const PILL = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium';

export function CategoryBadge({ name }: { name: string }) {
  return <span className={`${PILL} bg-primary-light text-primary-dark`}>{name}</span>;
}

/** Seats left, colored by how close the event is to full. */
export function SeatsBadge({ event }: { event: Pick<AttendeeEvent, 'seatsLeft' | 'capacity' | 'isFull'> }) {
  const t = useTranslations('AttendeeCommon');
  const tone = seatsTone(event);
  const classes =
    tone === 'full'
      ? 'bg-danger-light text-danger'
      : tone === 'low'
        ? 'bg-accent-light text-accent-dark'
        : 'bg-background text-text-muted';
  return (
    <span className={`${PILL} ${classes}`}>
      <SeatIcon className="size-3.5" />
      {tone === 'full' ? t('full') : t('seatsLeft', { count: event.seatsLeft })}
    </span>
  );
}

/** One label for a booking, most specific first: attended > event cancelled > booking status. */
export function BookingBadge({ booking }: { booking: Booking }) {
  const t = useTranslations('MyBookings.status');
  if (booking.status === 'CONFIRMED' && booking.checkedInAt) {
    return <span className={`${PILL} bg-success-light text-success`}>{t('attended')}</span>;
  }
  if (booking.event.status === 'CANCELLED') {
    return <span className={`${PILL} bg-danger-light text-danger`}>{t('eventCancelled')}</span>;
  }
  if (booking.status === 'CANCELLED') {
    return <span className={`${PILL} bg-background text-text-muted`}>{t('cancelled')}</span>;
  }
  return <span className={`${PILL} bg-primary-light text-primary-dark`}>{t('confirmed')}</span>;
}
