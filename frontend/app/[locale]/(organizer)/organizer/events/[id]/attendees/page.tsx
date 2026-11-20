'use client';

// FR-14: who is registered for one of the organizer's own events, and who has arrived.
// Calls GET /api/organizer/events/:id, GET /api/organizer/events/:id/attendees and
// POST /api/organizer/events/:id/attendees/:registrationId/check-in (the door's fallback for
// someone who cannot show their QR; scanning lives on the check-in page).
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import { Link } from '@/i18n/navigation';
import { SelectField } from '@/components/FormField';
import { BackIcon, CheckIcon, ScanIcon } from '@/components/Icons';
import { TEXT_LINK } from '@/components/styles';
import PageHeader from '@/components/PageHeader';
import Pagination from '../../../../../_dashboard/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../../../../_dashboard/ui/States';
import { BookingStatusBadge } from '../../../../../_dashboard/ui/StatusBadges';
import { CAMPUS_TIME_ZONE, DATE_TIME_FORMAT } from '../../../../../_dashboard/lib/campusTime';
import { BOOKING_STATUSES, type BookingStatus } from '../../../../../_dashboard/lib/types';
import { bothOk, useApiQuery } from '../../../../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../../../../_dashboard/lib/useDashboardError';
import { checkInById, getMyEvent, listAttendees } from '../../../../_lib/organizer-api';

const PAGE_SIZE = 50;

// One row layout for the header and every attendee from md up; stacked on phones.
const ROW = 'grid gap-x-4 gap-y-1 px-5 py-4 sm:px-6 md:grid-cols-[2fr_3fr_1fr_2fr_2fr] md:items-center';

export default function AttendeesPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Organizer.attendeesPage');
  const tNav = useTranslations('Organizer');
  const tCommon = useTranslations('Dashboard');
  const tStatus = useTranslations('Dashboard.bookingStatus');
  const format = useFormatter();
  const errorMessage = useDashboardError();

  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [page, setPage] = useState(1);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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
  const summary = query.data?.[1].summary;
  // Same rule as the API: an approved event that has not ended yet.
  const checkInOpen = Boolean(
    event && event.status === 'APPROVED' && new Date(event.endsAt) > new Date()
  );

  async function onCheckIn(registrationId: string, name: string) {
    setNotice(null);
    setCheckingId(registrationId);
    const result = await checkInById(id, registrationId);
    setCheckingId(null);
    if (!result.ok) {
      setNotice({ kind: 'error', text: errorMessage(result.code) });
      return;
    }
    setNotice({ kind: 'success', text: t('checkedInNotice', { name }) });
    query.reload();
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={event?.title}
        eyebrow={
          <Link href="/organizer" className={`flex w-fit items-center gap-1.5 ${TEXT_LINK}`}>
            <BackIcon />
            {tNav('backToEvents')}
          </Link>
        }
        actions={
          checkInOpen ? (
            <Button href={`/organizer/events/${id}/check-in`} icon={<ScanIcon />}>
              {t('scan')}
            </Button>
          ) : undefined
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
          <div className="flex flex-col items-end gap-0.5 text-sm tabular-nums">
            {summary ? (
              <p className="font-medium text-text">
                {t('checkedInCount', { checkedIn: summary.checkedIn, confirmed: summary.confirmed })}
              </p>
            ) : null}
            <p className="text-text-muted">{t('count', { count: pagination.total })}</p>
          </div>
        ) : null}
      </div>

      {notice ? <FormMessage kind={notice.kind}>{notice.text}</FormMessage> : null}

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
              <span>{t('colCheckIn')}</span>
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
                  <span className="pt-1 md:pt-0">
                    {attendee.checkedInAt ? (
                      <Badge tone="success" icon={<CheckIcon className="size-3.5" />}>
                        {t('checkedInAt', {
                          time: format.dateTime(new Date(attendee.checkedInAt), {
                            timeStyle: 'short',
                            timeZone: CAMPUS_TIME_ZONE,
                          }),
                        })}
                      </Badge>
                    ) : attendee.status === 'CONFIRMED' && checkInOpen ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        loading={checkingId === attendee.id}
                        disabled={checkingId !== null && checkingId !== attendee.id}
                        onClick={() => onCheckIn(attendee.id, attendee.user.fullName)}
                      >
                        {t('checkIn')}
                      </Button>
                    ) : (
                      <span className="text-sm text-text-muted">
                        <span className="md:hidden">{t('colCheckIn')}: </span>
                        {t('notCheckedIn')}
                      </span>
                    )}
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
