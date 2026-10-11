'use client';

// Admin overview: platform totals and the events waiting for a decision (FR-17).
// Calls GET /api/admin/events (pending list + totals), GET /api/admin/users (total),
// GET /api/admin/categories (total), POST /api/admin/events/:id/approve|reject.
import { useFormatter, useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { Link } from '@/i18n/navigation';
import type { ApiResult } from '@/lib/api';
import { TEXT_LINK } from '../../_dashboard/ui/focus';
import PageHeader from '../../_dashboard/ui/PageHeader';
import StatTile, { StatGrid } from '../../_dashboard/ui/StatTile';
import { EmptyState, ErrorState, LoadingState } from '../../_dashboard/ui/States';
import type { AdminEvent } from '../../_dashboard/lib/types';
import { useApiQuery } from '../../_dashboard/lib/useApiQuery';
import { listCategories, listEvents, listUsers } from '../_lib/admin-api';
import { useEventModeration } from '../_lib/useEventModeration';
import AdminEventCard from '../_ui/AdminEventCard';

const PENDING_PREVIEW = 4;

type Overview = {
  pending: AdminEvent[];
  pendingTotal: number;
  eventsTotal: number;
  usersTotal: number;
  categoriesTotal: number;
};

/** Everything the overview shows, in one parallel round - nothing here depends on anything else. */
async function loadOverview(): Promise<ApiResult<Overview>> {
  const [pending, events, users, categories] = await Promise.all([
    listEvents({ status: 'PENDING', limit: PENDING_PREVIEW }),
    listEvents({ limit: 1 }),
    listUsers({ limit: 1 }),
    listCategories(),
  ]);
  if (!pending.ok) return pending;
  if (!events.ok) return events;
  if (!users.ok) return users;
  if (!categories.ok) return categories;
  return {
    ok: true,
    status: 200,
    data: {
      pending: pending.data.events,
      pendingTotal: pending.data.pagination.total,
      eventsTotal: events.data.pagination.total,
      usersTotal: users.data.pagination.total,
      categoriesTotal: categories.data.categories.length,
    },
  };
}

export default function AdminOverviewPage() {
  const t = useTranslations('Admin.overview');
  const format = useFormatter();

  const overview = useApiQuery('admin-overview', loadOverview);
  const moderation = useEventModeration(overview.reload);

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {overview.loading ? (
        <LoadingState />
      ) : overview.errorCode || !overview.data ? (
        <ErrorState code={overview.errorCode ?? 'UNKNOWN'} onRetry={overview.reload} />
      ) : (
        <>
          <section aria-label={t('statsLabel')}>
            <StatGrid>
              <StatTile
                label={t('stats.pending')}
                value={format.number(overview.data.pendingTotal)}
                highlight
              />
              <StatTile label={t('stats.events')} value={format.number(overview.data.eventsTotal)} />
              <StatTile label={t('stats.users')} value={format.number(overview.data.usersTotal)} />
              <StatTile
                label={t('stats.categories')}
                value={format.number(overview.data.categoriesTotal)}
              />
            </StatGrid>
          </section>

          <section aria-labelledby="pending-heading" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="pending-heading" className="text-start text-lg font-bold text-text">
                {t('pendingTitle')}
              </h2>
              <Link href="/admin/events" className={`text-sm ${TEXT_LINK}`}>
                {t('viewAllEvents')}
              </Link>
            </div>

            {moderation.notice ? (
              <FormMessage kind={moderation.notice.kind}>{moderation.notice.text}</FormMessage>
            ) : null}

            {overview.data.pending.length === 0 ? (
              <EmptyState title={t('pendingEmpty')} />
            ) : (
              <ul
                aria-busy={overview.refreshing}
                className={`grid gap-4 lg:grid-cols-2 ${overview.refreshing ? 'opacity-60' : ''}`}
              >
                {overview.data.pending.map((event) => (
                  <li key={event.id} className="min-w-0">
                    <AdminEventCard
                      event={event}
                      busy={moderation.busyFor(event.id)}
                      onAction={moderation.run}
                      allowDelete={false}
                      titleAs="h3"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
