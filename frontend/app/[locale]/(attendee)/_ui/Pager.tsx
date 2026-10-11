'use client';

// Previous / next for the feed: the shared pager with the attendee wording.
import { useTranslations } from 'next-intl';
import Pagination from '@/components/Pagination';

type Props = { page: number; totalPages: number; onPage: (page: number) => void };

export default function Pager({ page, totalPages, onPage }: Props) {
  const t = useTranslations('AttendeeCommon');

  return (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPage={onPage}
      labels={{
        nav: t('pagination'),
        previous: t('previous'),
        next: t('next'),
        position: t('pageOf', { page, total: totalPages }),
      }}
    />
  );
}
