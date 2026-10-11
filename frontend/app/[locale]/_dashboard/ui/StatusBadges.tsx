'use client';

import { useTranslations } from 'next-intl';
import Badge, { type BadgeTone } from '@/components/Badge';
import type { BookingStatus, EventStatus } from '../lib/types';

const eventTones: Record<EventStatus, BadgeTone> = {
  PENDING: 'neutral',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'muted',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const t = useTranslations('Dashboard.eventStatus');
  return <Badge tone={eventTones[status]}>{t(status)}</Badge>;
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const t = useTranslations('Dashboard.bookingStatus');
  return <Badge tone={status === 'CONFIRMED' ? 'success' : 'muted'}>{t(status)}</Badge>;
}
