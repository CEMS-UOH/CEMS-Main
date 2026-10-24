'use client';

// What attendees thought of one of the organizer's own events: the average, how the stars
// are spread, and every comment. Calls GET /api/organizer/events/:id and
// GET /api/organizer/events/:id/feedback.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import { BackIcon, StarIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import { TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import { DATE_TIME_FORMAT } from '../../../../../_dashboard/lib/campusTime';
import { bothOk, useApiQuery } from '../../../../../_dashboard/lib/useApiQuery';
import Pagination from '../../../../../_dashboard/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../../../../../_dashboard/ui/States';
import { getMyEvent, listEventFeedback, type FeedbackSummary } from '../../../../_lib/organizer-api';

const PAGE_SIZE = 20;
const STARS = [5, 4, 3, 2, 1] as const;

export default function EventFeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Organizer.feedbackPage');
  const tNav = useTranslations('Organizer');
  const format = useFormatter();
  const [page, setPage] = useState(1);

  const query = useApiQuery(`organizer-feedback:${id}:${page}`, async () =>
    bothOk(...(await Promise.all([getMyEvent(id), listEventFeedback(id, { page, limit: PAGE_SIZE })])))
  );

  const backLink = (
    <Link href="/organizer" className={`flex w-fit items-center gap-1.5 ${TEXT_LINK}`}>
      <BackIcon />
      {tNav('backToEvents')}
    </Link>
  );

  return (
    <>
      <PageHeader title={t('title')} subtitle={query.data?.[0].event.title} eyebrow={backLink} />

      {query.loading ? (
        <LoadingState />
      ) : query.errorCode || !query.data ? (
        <ErrorState code={query.errorCode ?? 'UNKNOWN'} onRetry={query.reload} />
      ) : query.data[1].summary.count === 0 ? (
        <EmptyState
          icon={<StarIcon filled={false} className="size-6" />}
          title={t('emptyTitle')}
          body={new Date(query.data[0].event.endsAt) > new Date() ? t('emptyNotEnded') : t('emptyEnded')}
        />
      ) : (
        <>
          <Summary summary={query.data[1].summary} />

          <section aria-labelledby="comments-title" className="flex flex-col gap-4">
            <h2 id="comments-title" className="type-h2 text-start text-text">
              {t('commentsTitle')}
            </h2>
            <ul
              aria-busy={query.refreshing}
              className={`flex flex-col gap-3 ${query.refreshing ? 'opacity-60' : ''}`}
            >
              {query.data[1].feedback.map((item) => (
                <li key={item.id}>
                  <Card className="flex flex-col gap-2 text-start">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-bold text-text [overflow-wrap:anywhere]">
                        {item.user.fullName}
                      </span>
                      <Stars rating={item.rating} label={t('stars', { count: item.rating })} />
                    </div>
                    {item.comment ? (
                      <p dir="auto" className="text-sm whitespace-pre-line text-text [overflow-wrap:anywhere]">
                        {item.comment}
                      </p>
                    ) : (
                      <p className="text-sm text-text-muted">{t('noComment')}</p>
                    )}
                    <time dateTime={item.createdAt} className="text-xs text-text-muted">
                      {format.dateTime(new Date(item.createdAt), DATE_TIME_FORMAT)}
                    </time>
                  </Card>
                </li>
              ))}
            </ul>
            <Pagination pagination={query.data[1].pagination} onPageChange={setPage} disabled={query.refreshing} />
          </section>
        </>
      )}
    </>
  );
}

function Summary({ summary }: { summary: FeedbackSummary }) {
  const t = useTranslations('Organizer.feedbackPage');
  const format = useFormatter();
  const most = Math.max(...Object.values(summary.distribution), 1);

  return (
    <Card className="grid gap-6 text-start sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
      <div className="flex flex-col gap-1">
        <p className="text-5xl font-bold text-text tabular-nums">
          {format.number(summary.average ?? 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
        <Stars
          rating={Math.round(summary.average ?? 0)}
          label={t('averageLabel', { average: summary.average ?? 0 })}
          size="size-5"
        />
        <p className="text-sm text-text-muted">{t('ratingsCount', { count: summary.count })}</p>
      </div>

      {/* One bar per number of stars. The numbers are written out; the bars only echo them. */}
      <dl className="flex flex-col gap-2">
        {STARS.map((stars) => {
          const n = summary.distribution[String(stars) as keyof FeedbackSummary['distribution']];
          return (
            <div key={stars} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3">
              <dt className="text-sm text-text-muted">{t('starsShort', { count: stars })}</dt>
              <dd aria-hidden className="h-2.5 overflow-hidden rounded-lg bg-background">
                <div className="h-full rounded-lg bg-accent" style={{ width: `${(n / most) * 100}%` }} />
              </dd>
              <dd className="text-end text-sm text-text tabular-nums">{format.number(n)}</dd>
            </div>
          );
        })}
      </dl>
    </Card>
  );
}

function Stars({ rating, label, size = 'size-4' }: { rating: number; label: string; size?: string }) {
  return (
    <span role="img" aria-label={label} className="flex text-accent">
      {[1, 2, 3, 4, 5].map((value) => (
        <StarIcon key={value} filled={value <= rating} className={size} />
      ))}
    </span>
  );
}
