'use client';

// One of the organizer's own events: status, when/where, how full it is, and only the actions
// the API says are allowed right now (canEdit / canDelete come from the backend).
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import { ScanIcon } from '@/components/Icons';
import ConfirmAction from '../../_dashboard/ui/ConfirmAction';
import { Meta, MetaList } from '../../_dashboard/ui/Meta';
import { EventStatusBadge } from '../../_dashboard/ui/StatusBadges';
import { DATE_TIME_FORMAT } from '../../_dashboard/lib/campusTime';
import type { OrganizerEvent } from '../../_dashboard/lib/types';

type Props = {
  event: OrganizerEvent;
  deleting: boolean;
  onDelete: (event: OrganizerEvent) => void;
};

export default function EventCard({ event, deleting, onDelete }: Props) {
  const t = useTranslations('Organizer');
  const tCommon = useTranslations('Dashboard');
  const format = useFormatter();

  const filled = event.capacity > 0 ? Math.min(100, (event.seatsTaken / event.capacity) * 100) : 0;

  return (
    <Card className="flex min-w-0 flex-col gap-4 text-start">
      {/* The status chip drops below the title when there is no room for both. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="type-h3 min-w-0 flex-1 basis-44 text-text [overflow-wrap:anywhere]">
          {event.title}
        </h2>
        <EventStatusBadge status={event.status} />
      </div>

      <MetaList>
        <Meta label={tCommon('starts')}>
          {format.dateTime(new Date(event.startsAt), DATE_TIME_FORMAT)}
        </Meta>
        <Meta label={tCommon('ends')}>
          {format.dateTime(new Date(event.endsAt), DATE_TIME_FORMAT)}
        </Meta>
        <Meta label={tCommon('venue')}>{event.venue ? event.venue.name : tCommon('noVenue')}</Meta>
        <Meta label={tCommon('category')}>{event.category.name}</Meta>
      </MetaList>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text tabular-nums">
            {t('seats', { taken: event.seatsTaken, capacity: event.capacity })}
          </span>
          {event.isFull ? <Badge tone="neutral">{t('full')}</Badge> : null}
        </div>
        <div aria-hidden="true" className="h-2 overflow-hidden rounded-lg bg-background">
          <div
            className="h-2 rounded-lg bg-primary transition-[width] duration-300"
            style={{ width: `${filled}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button variant="secondary" size="sm" href={`/organizer/events/${event.id}/attendees`}>
          {t('attendees')}
        </Button>
        {/* Check-in is open while the event is approved and has not ended (same rule as the API). */}
        {event.status === 'APPROVED' && new Date(event.endsAt) > new Date() ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<ScanIcon />}
            href={`/organizer/events/${event.id}/check-in`}
          >
            {t('attendeesPage.scan')}
          </Button>
        ) : null}
        {event.canEdit ? (
          <Button variant="secondary" size="sm" href={`/organizer/events/${event.id}/edit`}>
            {tCommon('edit')}
          </Button>
        ) : null}
        {event.canDelete ? (
          <ConfirmAction
            label={tCommon('delete')}
            question={t('deleteConfirm')}
            confirmLabel={tCommon('confirmDelete')}
            busyLabel={tCommon('deleting')}
            busy={deleting}
            onConfirm={() => onDelete(event)}
          />
        ) : null}
      </div>
    </Card>
  );
}
