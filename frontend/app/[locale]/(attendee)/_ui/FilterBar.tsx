'use client';

// FR-04: search and filter the feed. Category, venue and day are sent to the API; the text
// search runs over the loaded events (the API has no text search parameter yet).
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import type { Category, Venue } from '../_lib/attendee-api';
import type { FeedFilters } from '../_lib/rules';
import { FOCUS_RING, INPUT } from '../_lib/styles';
import { SearchIcon } from './Icons';

type Props = {
  filters: FeedFilters;
  options: { categories: Category[]; venues: Venue[] };
  search: string;
  onSearch: (value: string) => void;
  onFilter: (change: Partial<Pick<FeedFilters, 'category' | 'venue' | 'date'>>) => void;
  onClear: () => void;
  canClear: boolean;
};

const LABEL = 'text-xs font-medium text-text-muted';

export default function FilterBar({ filters, options, search, onSearch, onFilter, onClear, canClear }: Props) {
  const t = useTranslations('Events.filters');

  return (
    <Card className="flex flex-col gap-4" role="search">
      <div className="relative">
        <label htmlFor="event-search" className="sr-only">
          {t('search')}
        </label>
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-text-muted" />
        <input
          id="event-search"
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          autoComplete="off"
          className={`${INPUT} ps-10`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-category" className={LABEL}>
            {t('category')}
          </label>
          <select
            id="filter-category"
            value={filters.category}
            onChange={(e) => onFilter({ category: e.target.value })}
            className={INPUT}
          >
            <option value="">{t('allCategories')}</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-venue" className={LABEL}>
            {t('venue')}
          </label>
          <select
            id="filter-venue"
            value={filters.venue}
            onChange={(e) => onFilter({ venue: e.target.value })}
            className={INPUT}
          >
            <option value="">{t('allVenues')}</option>
            {options.venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.building ? `${v.name} - ${v.building}` : v.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-date" className={LABEL}>
            {t('date')}
          </label>
          <input
            id="filter-date"
            type="date"
            value={filters.date}
            onChange={(e) => onFilter({ date: e.target.value })}
            className={INPUT}
          />
        </div>
      </div>

      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          className={`w-fit rounded-sm text-sm font-medium text-primary hover:underline ${FOCUS_RING}`}
        >
          {t('clear')}
        </button>
      ) : null}
    </Card>
  );
}
