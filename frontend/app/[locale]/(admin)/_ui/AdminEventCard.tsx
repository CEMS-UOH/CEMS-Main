'use client';

// One event as the admin sees it: who organizes it, when/where, how many bookings, and the
// actions the API allows - approve/reject only while PENDING (FR-17), delete always (FR-22).
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { CheckIcon } from '@/components/Icons';
import ConfirmAction from '../../_dashboard/ui/ConfirmAction';
import { Meta, MetaList } from '../../_dashboard/ui/Meta';
import { EventStatusBadge } from '../../_dashboard/ui/StatusBadges';
import { DATE_TIME_FORMAT } from '../../_dashboard/lib/campusTime';
import type { AdminEvent } from '../../_dashboard/lib/types';

export type EventAction = 'approve' | 'reject' | 'delete';

type Props = {
  event: AdminEvent;
  /** The action currently running for THIS event, if any. */
  busy: EventAction | null;
  onAction: (event: AdminEvent, action: EventAction) => void;
  /** The overview only moderates; deleting lives on the full events screen. */
  allowDelete?: boolean;
  /** Heading level of the event title, so it nests correctly under the page's own headings. */
  titleAs?: 'h2' | 'h3';
};

export default function AdminEventCard({
  event,
  busy,
  onAction,
  allowDelete = true,
  titleAs: Title = 'h2',
}: Props) {
  const t = useTranslations('Admin.events');
  const tCommon = useTranslations('Dashboard');
  const format = useFormatter();
  const isBusy = busy !== null;

  return (
    <Card className="flex min-w-0 flex-col gap-4 text-start">
      {/* The status chip drops below the title when there is no room for both. */}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <Title className="type-h3 min-w-0 flex-1 basis-44 text-text [overflow-wrap:anywhere]">
          {event.title}
        </Title>
        <EventStatusBadge status={event.status} />
      </div>

      <MetaList>
        <Meta label={tCommon('organizer')}>
          {event.organizer.fullName}
          <span dir="ltr" className="block text-xs text-text-muted">
            {event.organizer.email}
          </span>
        </Meta>
        <Meta label={tCommon('category')}>{event.category.name}</Meta>
        <Meta label={tCommon('starts')}>
          {format.dateTime(new Date(event.startsAt), DATE_TIME_FORMAT)}
        </Meta>
        <Meta label={tCommon('ends')}>
          {format.dateTime(new Date(event.endsAt), DATE_TIME_FORMAT)}
        </Meta>
        <Meta label={tCommon('venue')}>{event.venue ? event.venue.name : tCommon('noVenue')}</Meta>
        <Meta label={t('bookingsLabel')}>
          <span className="tabular-nums">
            {t('bookings', { count: event.confirmedBookings, capacity: event.capacity })}
          </span>
        </Meta>
      </MetaList>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {event.status === 'PENDING' ? (
          <>
            <Button
              size="sm"
              icon={<CheckIcon />}
              loading={busy === 'approve'}
              disabled={isBusy}
              onClick={() => onAction(event, 'approve')}
            >
              {busy === 'approve' ? t('approving') : t('approve')}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              loading={busy === 'reject'}
              disabled={isBusy}
              onClick={() => onAction(event, 'reject')}
            >
              {busy === 'reject' ? t('rejecting') : t('reject')}
            </Button>
          </>
        ) : null}
        {allowDelete ? (
          <ConfirmAction
            label={tCommon('delete')}
            question={t('deleteConfirm')}
            confirmLabel={tCommon('confirmDelete')}
            busyLabel={tCommon('deleting')}
            busy={busy === 'delete'}
            disabled={isBusy}
            onConfirm={() => onAction(event, 'delete')}
          />
        ) : null}
      </div>
    </Card>
  );
}
