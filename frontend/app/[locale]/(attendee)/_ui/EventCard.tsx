'use client';

// One event in the feed (FR-03). The whole card is a single link to the event page (FR-09).
import { useTranslations } from 'next-intl';
import { cardClasses } from '@/components/Card';
import { CalendarIcon, PinIcon } from '@/components/Icons';
import { FOCUS_RING } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import type { AttendeeEvent } from '../_lib/attendee-api';
import { useEventDates } from '../_lib/format';
import { CategoryBadge, SeatsBadge } from './Badges';
import EventImage from './EventImage';

export default function EventCard({ event }: { event: AttendeeEvent }) {
  const t = useTranslations('AttendeeCommon');
  const dates = useEventDates();
  const badge = dates.badge(event.startsAt);

  return (
    <Link
      href={`/events/${event.id}`}
      className={`group flex w-full flex-col overflow-hidden ${cardClasses({ padded: false, interactive: true })} ${FOCUS_RING}`}
    >
      <div className="relative">
        <EventImage src={event.imageUrl} alt="" className="aspect-[16/9] w-full" />
        <div
          aria-hidden
          className="absolute start-3 top-3 flex min-w-12 flex-col items-center rounded-lg bg-surface/95 px-2 py-1 leading-tight shadow-[var(--shadow-card)]"
        >
          <span className="text-lg font-bold text-primary-dark">{badge.day}</span>
          <span className="text-xs font-medium text-text-muted">{badge.month}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 text-start">
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge name={event.category.name} />
          <SeatsBadge event={event} />
        </div>

        <h3 className="type-h3 line-clamp-2 text-text transition-colors duration-150 group-hover:text-primary">
          {event.title}
        </h3>

        <dl className="mt-auto flex flex-col gap-1.5 text-sm text-text-muted">
          <div className="flex items-start gap-2">
            <dt className="mt-0.5 shrink-0">
              <CalendarIcon />
              <span className="sr-only">{t('when')}</span>
            </dt>
            <dd>{dates.range(event.startsAt, event.endsAt)}</dd>
          </div>
          {event.venue ? (
            <div className="flex items-start gap-2">
              <dt className="mt-0.5 shrink-0">
                <PinIcon />
                <span className="sr-only">{t('where')}</span>
              </dt>
              <dd className="truncate">{event.venue.name}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </Link>
  );
}
