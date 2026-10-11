'use client';

import { useTranslations } from 'next-intl';
import Button from './Button';
import type { Pagination as PaginationInfo } from '../lib/types';

type Props = {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

/** Previous / next with the current position. Renders nothing when there is one page. */
export default function Pagination({ pagination, onPageChange, disabled }: Props) {
  const t = useTranslations('Dashboard');
  const { page, totalPages } = pagination;
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={t('pagination')} className="flex flex-wrap items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        {t('previous')}
      </Button>
      <span className="text-sm text-text-muted tabular-nums" aria-live="polite">
        {t('pageOf', { page, total: totalPages })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t('next')}
      </Button>
    </nav>
  );
}
