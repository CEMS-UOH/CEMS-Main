'use client';

// Every event from every organizer: approve/reject (FR-17) and permanent delete (FR-22).
// Calls GET /api/admin/events, POST /api/admin/events/:id/approve|reject,
// DELETE /api/admin/events/:id.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { SelectField } from '../../../_dashboard/ui/Field';
import PageHeader from '../../../_dashboard/ui/PageHeader';
import Pagination from '../../../_dashboard/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../../_dashboard/ui/States';
import { EVENT_STATUSES, type EventStatus } from '../../../_dashboard/lib/types';
import { useApiQuery } from '../../../_dashboard/lib/useApiQuery';
import { listEvents } from '../../_lib/admin-api';
import { useEventModeration } from '../../_lib/useEventModeration';
import AdminEventCard from '../../_ui/AdminEventCard';

const PAGE_SIZE = 10;

export default function AdminEventsPage() {
  const t = useTranslations('Admin.events');
  const tCommon = useTranslations('Dashboard');
  const tStatus = useTranslations('Dashboard.eventStatus');

  const [status, setStatus] = useState<EventStatus | ''>('');
  const [page, setPage] = useState(1);

  const list = useApiQuery(`admin-events:${status}:${page}`, () =>
    listEvents({ status, page, limit: PAGE_SIZE })
  );

  const moderation = useEventModeration(() => {
    // Acting on the only event of the last page would leave an empty page behind.
    if (list.data && list.data.events.length === 1 && page > 1) setPage(page - 1);
    else list.reload();
  });

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="max-w-xs">
        <SelectField
          id="status-filter"
          label={tCommon('filterStatus')}
          value={status}
          onChange={(value) => {
            setStatus(value as EventStatus | '');
            setPage(1);
          }}
          options={[
            { value: '', label: tCommon('all') },
            ...EVENT_STATUSES.map((s) => ({ value: s, label: tStatus(s) })),
          ]}
        />
      </div>

      {moderation.notice ? (
        <FormMessage kind={moderation.notice.kind}>{moderation.notice.text}</FormMessage>
      ) : null}

      {list.loading ? (
        <LoadingState />
      ) : list.errorCode || !list.data ? (
        <ErrorState code={list.errorCode ?? 'UNKNOWN'} onRetry={list.reload} />
      ) : list.data.events.length === 0 ? (
        <EmptyState title={status ? t('emptyFiltered') : t('empty')} />
      ) : (
        <>
          <ul
            aria-busy={list.refreshing}
            className={`grid gap-4 lg:grid-cols-2 ${list.refreshing ? 'opacity-60' : ''}`}
          >
            {list.data.events.map((event) => (
              <li key={event.id} className="min-w-0">
                <AdminEventCard
                  event={event}
                  busy={moderation.busyFor(event.id)}
                  onAction={moderation.run}
                />
              </li>
            ))}
          </ul>
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            disabled={list.refreshing}
          />
        </>
      )}
    </>
  );
}
