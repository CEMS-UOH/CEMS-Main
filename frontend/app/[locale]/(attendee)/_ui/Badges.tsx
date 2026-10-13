'use client';

// Small status pills used on cards, the event page and "My bookings". All of them are the
// shared Badge, so they match the status chips on the dashboards.
import { useTranslations } from 'next-intl';
import Badge from '@/components/Badge';
import { SeatIcon } from '@/components/Icons';
import type { AttendeeEvent, Booking } from '../_lib/attendee-api';
import { seatsTone } from '../_lib/rules';

export function CategoryBadge({ name }: { name: string }) {
  return <Badge tone="primary">{name}</Badge>;
}

/** Seats left, colored by how close the event is to full. */
export function SeatsBadge({ event }: { event: Pick<AttendeeEvent, 'seatsLeft' | 'capacity' | 'isFull'> }) {
  const t = useTranslations('AttendeeCommon');
  const tone = seatsTone(event);
  return (
    <Badge
      tone={tone === 'full' ? 'danger' : tone === 'low' ? 'accent' : 'muted'}
      icon={<SeatIcon className="size-3.5" />}
    >
      {tone === 'full' ? t('full') : t('seatsLeft', { count: event.seatsLeft })}
    </Badge>
  );
}

/** One label for a booking, most specific first: attended > event cancelled > booking status. */
export function BookingBadge({ booking }: { booking: Booking }) {
  const t = useTranslations('MyBookings.status');
  if (booking.status === 'CONFIRMED' && booking.checkedInAt) {
    return <Badge tone="success">{t('attended')}</Badge>;
  }
  if (booking.event.status === 'CANCELLED') {
    return <Badge tone="danger">{t('eventCancelled')}</Badge>;
  }
  if (booking.status === 'CANCELLED') {
    return <Badge tone="muted">{t('cancelled')}</Badge>;
  }
  return <Badge tone="primary">{t('confirmed')}</Badge>;
}
