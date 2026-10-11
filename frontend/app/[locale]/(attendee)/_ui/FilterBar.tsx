'use client';

// FR-04: search and filter the feed. Category, venue and day are sent to the API; the text
// search runs over the loaded events (the API has no text search parameter yet).
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { CONTROL, SelectField, TextField } from '@/components/FormField';
import { CloseIcon, SearchIcon } from '@/components/Icons';
import type { Category, Venue } from '../_lib/attendee-api';
import type { FeedFilters } from '../_lib/rules';

type Props = {
  filters: FeedFilters;
  options: { categories: Category[]; venues: Venue[] };
  search: string;
  onSearch: (value: string) => void;
  onFilter: (change: Partial<Pick<FeedFilters, 'category' | 'venue' | 'date'>>) => void;
  onClear: () => void;
  canClear: boolean;
};

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
          className={`${CONTROL} ps-10`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField
          id="filter-category"
          label={t('category')}
          value={filters.category}
          onChange={(category) => onFilter({ category })}
          options={[
            { value: '', label: t('allCategories') },
            ...options.categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <SelectField
          id="filter-venue"
          label={t('venue')}
          value={filters.venue}
          onChange={(venue) => onFilter({ venue })}
          options={[
            { value: '', label: t('allVenues') },
            ...options.venues.map((v) => ({
              value: v.id,
              label: v.building ? `${v.name} - ${v.building}` : v.name,
            })),
          ]}
        />
        <TextField
          id="filter-date"
          type="date"
          label={t('date')}
          value={filters.date}
          onChange={(date) => onFilter({ date })}
        />
      </div>

      {canClear ? (
        <div>
          <Button type="button" variant="ghost" size="sm" icon={<CloseIcon />} onClick={onClear}>
            {t('clear')}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
