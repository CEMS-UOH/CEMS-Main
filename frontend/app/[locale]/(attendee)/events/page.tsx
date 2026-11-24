'use client';

// FR-03 (list approved upcoming events) and FR-04 (filter by category, venue and day).
// Calls GET /api/attendee/events. Filters live in the URL, so a filtered feed can be shared
// and the back button works.
//
// Two views of the same feed: a grid of cards (the default) and a month calendar
// (?view=calendar&month=YYYY-MM). The calendar loads every matching event, not one page.
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import { useRouter } from '@/i18n/navigation';
import { CalendarIcon, GridIcon } from '@/components/Icons';
import { FOCUS_RING } from '@/components/styles';
import { listAllEvents, listEvents } from '../_lib/attendee-api';
import { campusDayKey } from '../_lib/calendar';
import {
  feedQueryString,
  filterOptions,
  hasActiveFilters,
  parseFeedFilters,
  searchEvents,
  type FeedFilters,
} from '../_lib/rules';
import { useQuery } from '../_lib/useQuery';
import EventCalendar from '../_ui/EventCalendar';
import EventCard from '../_ui/EventCard';
import FilterBar from '../_ui/FilterBar';
import Pager from '../_ui/Pager';
import Recommendations from '../_ui/Recommendations';
import { EmptyState, ErrorState, LoadingCards } from '../_ui/States';

const PAGE_SIZE = 50; // the API maximum; the text search and the filter choices use what is loaded
const OPTIONS_SAMPLE = 50;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

type View = 'list' | 'calendar';

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
  const view: View = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';
  const monthParam = searchParams.get('month') ?? '';
  const month = MONTH_RE.test(monthParam) ? monthParam : campusDayKey(new Date()).slice(0, 7);

  const feed = useQuery(
    view !== 'list'
      ? null
      : `attendee-events:${filters.category}:${filters.venue}:${filters.date}:${filters.page}`,
    () =>
      listEvents({
        category: filters.category || undefined,
        venue: filters.venue || undefined,
        date: filters.date || undefined,
        page: filters.page,
        limit: PAGE_SIZE,
      })
  );

  // The calendar needs every event of the month, so it asks for all pages (no date filter:
  // the grid itself is the date picker).
  const all = useQuery(view === 'calendar' ? `attendee-events-all:${filters.category}:${filters.venue}` : null, () =>
    listAllEvents({ category: filters.category || undefined, venue: filters.venue || undefined })
  );

  // Filter choices come from the upcoming events themselves (see filterOptions in rules.ts).
  // Unfiltered, the feed already holds them - asking again would send the same heavy query
  // twice at once. Only a filtered feed (or a later page) needs a separate first-page sample.
  const filteredFeed = view === 'calendar' || hasActiveFilters(filters) || filters.page > 1;
  const optionsQuery = useQuery(filteredFeed ? 'attendee-event-options' : null, () =>
    listEvents({ limit: OPTIONS_SAMPLE })
  );
  const optionEvents = filteredFeed ? optionsQuery.data?.events : feed.data?.events;
  const options = useMemo(() => filterOptions(optionEvents ?? [], locale), [optionEvents, locale]);

  const loaded = feed.data?.events;
  const shown = useMemo(() => searchEvents(loaded ?? [], search), [loaded, search]);
  const allEvents = all.data?.events;
  const calendarEvents = useMemo(() => searchEvents(allEvents ?? [], search), [allEvents, search]);
  const filtered = hasActiveFilters(filters);

  function go(next: FeedFilters, mode: 'replace' | 'push', nextView: View = view, nextMonth = monthParam) {
    const params = new URLSearchParams(feedQueryString(next).slice(1));
    if (nextView === 'calendar') {
      params.set('view', 'calendar');
      params.delete('date');
      params.delete('page');
      if (MONTH_RE.test(nextMonth)) params.set('month', nextMonth);
    }
    const query = params.toString();
    const href = `/events${query ? `?${query}` : ''}`;
    if (mode === 'push') router.push(href);
    else router.replace(href, { scroll: false });
  }

  const clearAll = () => {
    setSearch('');
    go({ category: '', venue: '', date: '', page: 1 }, 'replace');
  };

  // Switching to the calendar opens on the month of the chosen day, if there is one.
  const switchView = (next: View) =>
    go({ ...filters, page: 1 }, 'replace', next, next === 'calendar' && filters.date ? filters.date.slice(0, 7) : monthParam);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} actions={<ViewSwitch view={view} onView={switchView} />} />

      {/* Suggestions only on the plain first page: once someone filters or searches, they know
          what they want. */}
      {view === 'list' && !filtered && search.trim() === '' && filters.page === 1 ? <Recommendations /> : null}

      <FilterBar
        filters={filters}
        options={options}
        search={search}
        onSearch={setSearch}
        onFilter={(change) => go({ ...filters, ...change, page: 1 }, 'replace')}
        onClear={clearAll}
        canClear={filtered || search.trim() !== ''}
        showDate={view === 'list'}
      />

      {view === 'calendar' ? (
        all.errorCode ? (
          <ErrorState code={all.errorCode} onRetry={all.reload} />
        ) : all.loading || !all.data ? (
          <LoadingCards count={3} />
        ) : (
          <div aria-busy={all.refreshing} className={`transition-opacity duration-150 ${all.refreshing ? 'opacity-60' : ''}`}>
            <EventCalendar events={calendarEvents} month={month} onMonth={(m) => go(filters, 'replace', 'calendar', m)} />
          </div>
        )
      ) : feed.errorCode ? (
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

/** List or calendar: two buttons, the current one pressed. */
function ViewSwitch({ view, onView }: { view: View; onView: (view: View) => void }) {
  const t = useTranslations('Events.view');
  const options = [
    { key: 'list' as const, icon: <GridIcon />, label: t('list') },
    { key: 'calendar' as const, icon: <CalendarIcon />, label: t('calendar') },
  ];
  return (
    <div
      role="group"
      aria-label={t('label')}
      className="flex gap-1 rounded-lg border border-border bg-surface p-1 shadow-[var(--shadow-card)]"
    >
      {options.map((o) => {
        const on = o.key === view;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={on}
            onClick={() => onView(o.key)}
            className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150 ${FOCUS_RING} ${
              on ? 'bg-primary text-white' : 'text-text-muted hover:bg-primary-light hover:text-primary-dark'
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
