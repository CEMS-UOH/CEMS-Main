'use client';

// Previous / next for the feed. Arrows follow the reading direction (RTL in Arabic).
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import { BackIcon, ForwardIcon } from './Icons';

type Props = { page: number; totalPages: number; onPage: (page: number) => void };

export default function Pager({ page, totalPages, onPage }: Props) {
  const t = useTranslations('AttendeeCommon');
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={t('pagination')} className="flex items-center justify-between gap-3">
      <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        <BackIcon />
        {t('previous')}
      </Button>
      <span className="text-sm text-text-muted" aria-live="polite">
        {t('pageOf', { page, total: totalPages })}
      </span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t('next')}
        <ForwardIcon />
      </Button>
    </nav>
  );
}
