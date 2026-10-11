'use client';

// FR-03 (list approved upcoming events) and FR-04 (filter by category, venue and day).
// Calls GET /api/attendee/events. Filters live in the URL, so a filtered feed can be shared
// and the back button works.
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import { useRouter } from '@/i18n/navigation';
import { listEvents } from '../_lib/attendee-api';
import {
  feedQueryString,
  filterOptions,
  hasActiveFilters,
  parseFeedFilters,
  searchEvents,
  type FeedFilters,
} from '../_lib/rules';
import { useQuery } from '../_lib/useQuery';
import EventCard from '../_ui/EventCard';
import FilterBar from '../_ui/FilterBar';
import Pager from '../_ui/Pager';
import { EmptyState, ErrorState, LoadingCards } from '../_ui/States';

const PAGE_SIZE = 48; // the API allows up to 50; the text search covers what is loaded
const OPTIONS_SAMPLE = 50;

export default function EventsPage() {
  // useSearchParams needs a Suspense boundary so the page can still be prerendered.
  return (
    <Suspense fallback={<LoadingCards />}>
      <EventsFeed />
    </Suspense>
  );
}

function EventsFeed() {
  const t = useTranslations('Events');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseFeedFilters(searchParams);
  const [search, setSearch] = useState('');

  // Filter choices come from the upcoming events themselves (see filterOptions in rules.ts).
  const optionsQuery = useQuery('attendee-event-options', () => listEvents({ limit: OPTIONS_SAMPLE }));
  const optionEvents = optionsQuery.data?.events;
  const options = useMemo(() => filterOptions(optionEvents ?? [], locale), [optionEvents, locale]);

  const feed = useQuery(
    `attendee-events:${filters.category}:${filters.venue}:${filters.date}:${filters.page}`,
    () =>
      listEvents({
        category: filters.category || undefined,
        venue: filters.venue || undefined,
        date: filters.date || undefined,
        page: filters.page,
        limit: PAGE_SIZE,
      })
  );

  const loaded = feed.data?.events;
  const shown = useMemo(() => searchEvents(loaded ?? [], search), [loaded, search]);
  const filtered = hasActiveFilters(filters);

  function go(next: FeedFilters, mode: 'replace' | 'push') {
    const href = `/events${feedQueryString(next)}`;
    if (mode === 'push') router.push(href);
    else router.replace(href, { scroll: false });
  }

  const clearAll = () => {
    setSearch('');
    go({ category: '', venue: '', date: '', page: 1 }, 'replace');
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <FilterBar
        filters={filters}
        options={options}
        search={search}
        onSearch={setSearch}
        onFilter={(change) => go({ ...filters, ...change, page: 1 }, 'replace')}
        onClear={clearAll}
        canClear={filtered || search.trim() !== ''}
      />

      {feed.errorCode ? (
        <ErrorState code={feed.errorCode} onRetry={feed.reload} />
      ) : feed.loading || !feed.data ? (
        <LoadingCards />
      ) : feed.data.events.length === 0 ? (
        filtered ? (
          <EmptyState
            title={t('empty.filteredTitle')}
            body={t('empty.filteredBody')}
            action={
              <Button type="button" variant="secondary" onClick={clearAll}>
                {t('filters.clear')}
              </Button>
            }
          />
        ) : (
          <EmptyState title={t('empty.noneTitle')} body={t('empty.noneBody')} />
        )
      ) : (
        <section aria-labelledby="events-results" className="flex flex-col gap-5">
          <h2 id="events-results" className="text-start text-sm font-medium text-text-muted" aria-live="polite">
            {search.trim()
              ? t('searchCount', { shown: shown.length, count: loaded?.length ?? 0 })
              : t('count', { count: feed.data.pagination.total })}
          </h2>

          {shown.length === 0 ? (
            <EmptyState
              title={t('empty.searchTitle')}
              body={t('empty.searchBody')}
              action={
                <Button type="button" variant="secondary" onClick={() => setSearch('')}>
                  {t('filters.clearSearch')}
                </Button>
              }
            />
          ) : (
            <ul
              aria-busy={feed.refreshing}
              className={`grid gap-5 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 ${feed.refreshing ? 'opacity-60' : ''}`}
            >
              {shown.map((event) => (
                <li key={event.id} className="flex">
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          )}

          <Pager
            page={feed.data.pagination.page}
            totalPages={feed.data.pagination.totalPages}
            onPage={(page) => go({ ...filters, page }, 'push')}
          />
        </section>
      )}
    </div>
  );
}
