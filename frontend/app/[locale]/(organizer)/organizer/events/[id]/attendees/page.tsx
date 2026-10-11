'use client';

// FR-14: who is registered for one of the organizer's own events.
// Calls GET /api/organizer/events/:id and GET /api/organizer/events/:id/attendees.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import { Link } from '@/i18n/navigation';
import { SelectField } from '../../../../../_dashboard/ui/Field';
import { TEXT_LINK } from '../../../../../_dashboard/ui/focus';
import PageHeader from '../../../../../_dashboard/ui/PageHeader';
import Pagination from '../../../../../_dashboard/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../../../../_dashboard/ui/States';
import { BookingStatusBadge } from '../../../../../_dashboard/ui/StatusBadges';
import { DATE_TIME_FORMAT } from '../../../../../_dashboard/lib/campusTime';
import { BOOKING_STATUSES, type BookingStatus } from '../../../../../_dashboard/lib/types';
import { bothOk, useApiQuery } from '../../../../../_dashboard/lib/useApiQuery';
import { getMyEvent, listAttendees } from '../../../../_lib/organizer-api';

const PAGE_SIZE = 50;

// One row layout for the header and every attendee from md up; stacked on phones.
const ROW = 'grid gap-x-4 gap-y-1 px-5 py-4 md:grid-cols-[2fr_3fr_1fr_2fr] md:items-center';

export default function AttendeesPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Organizer.attendeesPage');
  const tNav = useTranslations('Organizer');
  const tCommon = useTranslations('Dashboard');
  const tStatus = useTranslations('Dashboard.bookingStatus');
  const format = useFormatter();

  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);

  const query = useApiQuery(`organizer-attendees:${id}:${status}:${page}`, async () =>
    bothOk(
      ...(await Promise.all([
        getMyEvent(id),
        listAttendees(id, { status, page, limit: PAGE_SIZE }),
      ]))
    )
  );

  const event = query.data?.[0].event;
  const attendees = query.data?.[1].attendees ?? [];
  const pagination = query.data?.[1].pagination;

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={event?.title}
        eyebrow={
          <Link href="/organizer" className={TEXT_LINK}>
            {tNav('backToEvents')}
          </Link>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <SelectField
            id="booking-status-filter"
            label={tCommon('filterStatus')}
            value={status}
            onChange={(value) => {
              setStatus(value as BookingStatus | '');
              setPage(1);
            }}
            options={[
              { value: '', label: tCommon('all') },
              ...BOOKING_STATUSES.map((s) => ({ value: s, label: tStatus(s) })),
            ]}
          />
        </div>
        {pagination ? (
          <p className="text-sm text-text-muted tabular-nums">
            {t('count', { count: pagination.total })}
          </p>
        ) : null}
      </div>

      {query.loading ? (
        <LoadingState />
      ) : query.errorCode || !query.data ? (
        <ErrorState code={query.errorCode ?? 'UNKNOWN'} onRetry={query.reload} />
      ) : attendees.length === 0 ? (
        <EmptyState title={status ? t('emptyFiltered') : t('empty')} />
      ) : (
        <>
          <Card padded={false} aria-busy={query.refreshing} className="overflow-hidden text-start">
            <div
              aria-hidden="true"
              className={`${ROW} hidden border-b border-border bg-background text-xs font-medium text-text-muted md:grid`}
            >
              <span>{t('colName')}</span>
              <span>{t('colEmail')}</span>
              <span>{t('colStatus')}</span>
              <span>{t('colRegistered')}</span>
            </div>
            <ul className={`divide-y divide-border ${query.refreshing ? 'opacity-60' : ''}`}>
              {attendees.map((attendee) => (
                <li key={attendee.id} className={ROW}>
                  <span className="min-w-0 text-sm font-medium text-text [overflow-wrap:anywhere]">
                    {attendee.user.fullName}
                  </span>
                  <a
                    href={`mailto:${attendee.user.email}`}
                    dir="ltr"
                    className={`min-w-0 w-fit max-w-full text-sm [overflow-wrap:anywhere] ${TEXT_LINK}`}
                  >
                    {attendee.user.email}
                  </a>
                  <span>
                    <BookingStatusBadge status={attendee.status} />
                  </span>
                  <span className="text-sm text-text-muted">
                    <span className="md:hidden">{t('colRegistered')}: </span>
                    {format.dateTime(new Date(attendee.createdAt), DATE_TIME_FORMAT)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          {pagination ? (
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
              disabled={query.refreshing}
            />
          ) : null}
        </>
      )}
    </>
  );
}
