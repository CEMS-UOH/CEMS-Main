'use client';

import { useTranslations } from 'next-intl';
import SharedPagination from '@/components/Pagination';
import type { Pagination as PaginationInfo } from '../lib/types';

type Props = {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

/** The shared pager with the dashboard's wording. Renders nothing when there is one page. */
export default function Pagination({ pagination, onPageChange, disabled }: Props) {
  const t = useTranslations('Dashboard');
  const { page, totalPages } = pagination;

  return (
    <SharedPagination
      page={page}
      totalPages={totalPages}
      onPage={onPageChange}
      disabled={disabled}
      labels={{
        nav: t('pagination'),
        previous: t('previous'),
        next: t('next'),
        position: t('pageOf', { page, total: totalPages }),
      }}
    />
  );
}
