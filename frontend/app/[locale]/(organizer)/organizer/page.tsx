'use client';

// Organizer dashboard: the organizer's own events with their approval status and bookings.
// Calls GET /api/organizer/events (list + per-status totals) and DELETE /api/organizer/events/:id.
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import type { ApiResult } from '@/lib/api';
import Button from '@/components/Button';
import { SelectField } from '../../_dashboard/ui/Field';
import PageHeader from '../../_dashboard/ui/PageHeader';
import Pagination from '../../_dashboard/ui/Pagination';
import StatTile, { StatGrid } from '../../_dashboard/ui/StatTile';
import { EmptyState, ErrorState, LoadingState } from '../../_dashboard/ui/States';
import { EVENT_STATUSES, type EventStatus, type OrganizerEvent } from '../../_dashboard/lib/types';
import { useApiQuery } from '../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../_dashboard/lib/useDashboardError';
import { deleteEvent, listMyEvents } from '../_lib/organizer-api';
import EventCard from '../_ui/EventCard';

const PAGE_SIZE = 10;

type Counts = { total: number; pending: number; approved: number; rejected: number };

/** Four tiny requests in parallel - the list endpoint returns the total for any status filter. */
async function loadCounts(): Promise<ApiResult<Counts>> {
  const [all, pending, approved, rejected] = await Promise.all([
    listMyEvents({ limit: 1 }),
    listMyEvents({ status: 'PENDING', limit: 1 }),
    listMyEvents({ status: 'APPROVED', limit: 1 }),
    listMyEvents({ status: 'REJECTED', limit: 1 }),
  ]);
  if (!all.ok) return all;
  if (!pending.ok) return pending;
  if (!approved.ok) return approved;
  if (!rejected.ok) return rejected;
  return {
    ok: true,
    status: 200,
    data: {
      total: all.data.pagination.total,
      pending: pending.data.pagination.total,
      approved: approved.data.pagination.total,
      rejected: rejected.data.pagination.total,
    },
  };
}

export default function OrganizerDashboardPage() {
  const t = useTranslations('Organizer');
  const tCommon = useTranslations('Dashboard');
  const tStatus = useTranslations('Dashboard.eventStatus');
  const format = useFormatter();
  const errorMessage = useDashboardError();

  const [status, setStatus] = useState<EventStatus | ''>('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const counts = useApiQuery('organizer-counts', loadCounts);
  const list = useApiQuery(`organizer-events:${status}:${page}`, () =>
    listMyEvents({ status, page, limit: PAGE_SIZE })
  );

  async function onDelete(event: OrganizerEvent) {
    setNotice(null);
    setDeletingId(event.id);
    const result = await deleteEvent(event.id);
    setDeletingId(null);

    if (!result.ok) {
      setNotice({ kind: 'error', text: errorMessage(result.code) });
      return;
    }
    setNotice({ kind: 'success', text: t('deleted') });
    counts.reload();
    // Deleting the only event on the last page would leave an empty page behind.
    if (list.data && list.data.events.length === 1 && page > 1) setPage(page - 1);
    else list.reload();
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<Button href="/organizer/events/new">{t('newEvent')}</Button>}
      />

      <section aria-label={t('statsLabel')}>
        {counts.loading ? (
          <LoadingState />
        ) : counts.errorCode || !counts.data ? (
          <ErrorState code={counts.errorCode ?? 'UNKNOWN'} onRetry={counts.reload} />
        ) : (
          <StatGrid>
            <StatTile label={t('stats.total')} value={format.number(counts.data.total)} />
            <StatTile
              label={t('stats.pending')}
              value={format.number(counts.data.pending)}
              highlight
            />
            <StatTile label={t('stats.approved')} value={format.number(counts.data.approved)} />
            <StatTile label={t('stats.rejected')} value={format.number(counts.data.rejected)} />
          </StatGrid>
        )}
      </section>

      <section aria-label={t('listLabel')} className="flex flex-col gap-4">
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

        {notice ? <FormMessage kind={notice.kind}>{notice.text}</FormMessage> : null}

        {list.loading ? (
          <LoadingState />
        ) : list.errorCode || !list.data ? (
          <ErrorState code={list.errorCode ?? 'UNKNOWN'} onRetry={list.reload} />
        ) : list.data.events.length === 0 ? (
          status ? (
            <EmptyState title={t('emptyFiltered')} />
          ) : (
            <EmptyState
              title={t('emptyTitle')}
              body={t('emptyBody')}
              action={<Button href="/organizer/events/new">{t('newEvent')}</Button>}
            />
          )
        ) : (
          <>
            <ul
              aria-busy={list.refreshing}
              className={`grid gap-4 lg:grid-cols-2 ${list.refreshing ? 'opacity-60' : ''}`}
            >
              {list.data.events.map((event) => (
                <li key={event.id} className="min-w-0">
                  <EventCard
                    event={event}
                    deleting={deletingId === event.id}
                    onDelete={onDelete}
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
      </section>
    </>
  );
}
