'use client';

// Organizer dashboard: the organizer's own events with their approval status and bookings.
// Calls GET /api/organizer/events (list + per-status totals, one request) and
// DELETE /api/organizer/events/:id.
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import Button from '@/components/Button';
import { PlusIcon } from '@/components/Icons';
import { SelectField } from '@/components/FormField';
import PageHeader from '@/components/PageHeader';
import Pagination from '../../_dashboard/ui/Pagination';
import StatTile, { StatGrid } from '../../_dashboard/ui/StatTile';
import { EmptyState, ErrorState, LoadingState } from '../../_dashboard/ui/States';
import { EVENT_STATUSES, type EventStatus, type OrganizerEvent } from '../../_dashboard/lib/types';
import { useApiQuery } from '../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../_dashboard/lib/useDashboardError';
import Card from '@/components/Card';
import { deleteEvent, listMyEvents } from '../_lib/organizer-api';
import { isRequestLimited } from '../_lib/requestLimit';
import EventCard from '../_ui/EventCard';

const PAGE_SIZE = 10;

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

  const list = useApiQuery(`organizer-events:${status}:${page}`, () =>
    listMyEvents({ status, page, limit: PAGE_SIZE })
  );
  // The counters come with the list (one request). They do not depend on the filter, so the
  // last answer's totals stay right while a new page or filter loads.
  const totals = list.data?.totals;
  // A new organizer may have one request waiting until an admin approves their first event
  // (enforced by the API). While that applies, "New event" is replaced by an explanation.
  const limited = totals ? isRequestLimited(totals) : false;
  const newEventButton = (
    <Button href="/organizer/events/new" icon={<PlusIcon />}>
      {t('newEvent')}
    </Button>
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
    // Deleting the only event on the last page would leave an empty page behind.
    if (list.data && list.data.events.length === 1 && page > 1) setPage(page - 1);
    else list.reload();
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={limited ? undefined : newEventButton}
      />

      {limited ? (
        <Card className="flex flex-col gap-1 text-start">
          <h2 className="type-h3 text-text">{t('limit.title')}</h2>
          <p className="text-sm text-text-muted">{t('limit.body')}</p>
        </Card>
      ) : null}

      <section aria-label={t('statsLabel')}>
        {list.loading ? (
          <LoadingState />
        ) : !totals ? (
          // The list below shows the error and its retry button; one is enough.
          null
        ) : (
          <StatGrid>
            <StatTile label={t('stats.total')} value={format.number(totals.all)} />
            <StatTile label={t('stats.pending')} value={format.number(totals.pending)} highlight />
            <StatTile label={t('stats.approved')} value={format.number(totals.approved)} />
            <StatTile label={t('stats.rejected')} value={format.number(totals.rejected)} />
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
              action={newEventButton}
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
