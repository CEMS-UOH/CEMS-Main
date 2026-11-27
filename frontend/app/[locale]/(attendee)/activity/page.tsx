'use client';

// "My activity": what an Attendee has done on campus - events attended, hours, how often they
// turn up, what they like, and their certificates. Worked out in the browser from their own
// bookings (GET /api/attendee/bookings, the same call as "My bookings"); see _lib/activity.ts.
import { useEffect, useMemo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { AwardIcon, CalendarIcon, ForwardIcon, StarIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import { FOCUS_RING } from '@/components/styles';
import { Link, useRouter } from '@/i18n/navigation';
import StatTile, { StatGrid } from '../../_dashboard/ui/StatTile';
import { summarizeActivity, type Activity, type CategoryCount, type MonthCount } from '../_lib/activity';
import { listBookings } from '../_lib/attendee-api';
import { CAMPUS_TIME_ZONE, useEventDates } from '../_lib/format';
import { useSession } from '../_lib/session';
import { useQuery } from '../_lib/useQuery';
import { EmptyState, ErrorState, LoadingBlock } from '../_ui/States';

export default function ActivityPage() {
  const t = useTranslations('Activity');
  const router = useRouter();
  const { session, user } = useSession();
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  const query = useQuery(isAttendee && user ? 'attendee-bookings' : null, () => listBookings());

  useEffect(() => {
    if (session.status === 'guest') router.replace('/login');
  }, [session.status, router]);

  const bookings = query.data?.bookings;
  const activity = useMemo(() => (bookings ? summarizeActivity(bookings, new Date()) : null), [bookings]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {session.status !== 'user' || (query.loading && !query.data) ? (
        <LoadingBlock />
      ) : !isAttendee ? (
        <EmptyState title={t('attendeesOnly')} />
      ) : query.errorCode || !activity ? (
        <ErrorState code={query.errorCode ?? 'UNKNOWN'} onRetry={query.reload} />
      ) : (bookings?.length ?? 0) === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button href="/events" icon={<CalendarIcon />}>
              {t('browse')}
            </Button>
          }
        />
      ) : (
        <ActivityView activity={activity} />
      )}
    </div>
  );
}

function ActivityView({ activity: a }: { activity: Activity }) {
  const t = useTranslations('Activity');
  const format = useFormatter();

  return (
    <div className="flex animate-fade-in flex-col gap-8">
      <section aria-label={t('statsLabel')}>
        <StatGrid>
          <StatTile label={t('stats.attended')} value={format.number(a.attended)} highlight />
          <StatTile label={t('stats.hours')} value={format.number(a.hours, { maximumFractionDigits: 1 })} />
          <StatTile
            label={t('stats.rate')}
            value={a.attendanceRate === null ? '—' : format.number(a.attendanceRate, { style: 'percent' })}
          />
          <StatTile
            label={t('stats.rating', { count: a.ratingsGiven })}
            value={a.averageRating === null ? '—' : format.number(a.averageRating, { minimumFractionDigits: 1 })}
          />
        </StatGrid>
      </section>

      {a.next ? <NextUp activity={a} /> : null}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <MonthChart rows={a.byMonth} />
        <Categories rows={a.categories} />
      </div>

      <Certificates activity={a} />
    </div>
  );
}

/** The soonest seat the attendee holds. */
function NextUp({ activity: a }: { activity: Activity }) {
  const t = useTranslations('Activity');
  const dates = useEventDates();
  const format = useFormatter();
  const next = a.next!;
  return (
    <Link
      href={`/events/${next.event.id}`}
      className={`group flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary-light p-5 text-start transition-colors duration-150 hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between ${FOCUS_RING}`}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-bold tracking-wide text-primary uppercase">
          {t('nextUp')} · {format.relativeTime(new Date(next.event.startsAt), new Date())}
        </span>
        <span dir="auto" className="truncate text-start text-lg font-bold text-primary-dark">
          {next.event.title}
        </span>
        <span className="text-sm text-primary-dark/80">{dates.range(next.event.startsAt, next.event.endsAt)}</span>
      </span>
      <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
        {t('upcomingCount', { count: a.upcoming })}
        <ForwardIcon className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
      </span>
    </Link>
  );
}

/** A nice top for the y axis: even, at least 2, so the middle line is a whole number. */
const axisTop = (max: number) => Math.max(2, max + (max % 2));

function MonthChart({ rows }: { rows: MonthCount[] }) {
  const t = useTranslations('Activity.months');
  const format = useFormatter();
  const top = axisTop(Math.max(...rows.map((r) => r.attended)));
  const ticks = [top, top / 2, 0];
  const monthName = (month: string, style: 'short' | 'long') =>
    format.dateTime(new Date(`${month}-15T12:00:00Z`), {
      month: style,
      year: style === 'long' ? 'numeric' : undefined,
      timeZone: CAMPUS_TIME_ZONE,
    });
  const total = rows.reduce((s, r) => s + r.attended, 0);

  return (
    <Card className="flex flex-col gap-5 text-start">
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text">{t('title')}</h2>
        <p className="text-sm text-text-muted">{t('subtitle', { count: total })}</p>
      </div>

      {total === 0 ? (
        <p className="rounded-lg bg-background px-4 py-8 text-center text-sm text-text-muted">{t('empty')}</p>
      ) : (
        <>
          <div className="grid grid-cols-[auto_1fr] gap-x-3">
            <div className="flex h-44 flex-col justify-between text-end text-xs text-text-muted tabular-nums" aria-hidden>
              {ticks.map((tick) => (
                <span key={tick} className="-my-2">
                  {format.number(tick)}
                </span>
              ))}
            </div>
            <div className="relative h-44">
              <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
                {ticks.map((tick) => (
                  <div key={tick} className="h-px bg-border" />
                ))}
              </div>
              <ul className="absolute inset-0 flex items-end justify-around gap-1">
                {rows.map((row) => {
                  const height = (row.attended / top) * 100;
                  const label = t('columnLabel', { month: monthName(row.month, 'long'), count: row.attended });
                  return (
                    <li key={row.month} className="group relative flex h-full flex-1 items-end justify-center">
                      {/* The whole slot is the hover and focus target, not just the bar. */}
                      <button
                        type="button"
                        aria-label={label}
                        className={`flex h-full w-full cursor-default items-end justify-center rounded-md hover:bg-primary-light/40 ${FOCUS_RING}`}
                      >
                        <span
                          className="block w-full max-w-8 animate-grow-up rounded-t-[4px] bg-primary transition-[filter] duration-150 group-hover:brightness-110"
                          style={{ height: `${height}%`, minHeight: row.attended > 0 ? 2 : 0 }}
                        />
                      </button>
                      <span
                        role="tooltip"
                        className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-48 flex-col gap-0.5 rounded-lg border border-border bg-surface px-3 py-2 text-start text-xs shadow-[var(--shadow-card-hover)] group-focus-within:flex group-hover:flex"
                      >
                        <strong className="text-sm text-text tabular-nums">{t('count', { count: row.attended })}</strong>
                        <span className="text-text-muted">{monthName(row.month, 'long')}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <span />
            <ul aria-hidden className="flex justify-around gap-1 pt-2 text-center text-xs text-text-muted">
              {rows.map((row) => (
                <li key={row.month} className="flex-1">
                  {monthName(row.month, 'short')}
                </li>
              ))}
            </ul>
          </div>

          <details className="text-sm">
            <summary className={`w-fit cursor-pointer rounded-sm text-primary ${FOCUS_RING}`}>{t('showTable')}</summary>
            <table className="mt-3 w-full text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="py-2 text-start font-medium">{t('month')}</th>
                  <th className="py-2 text-end font-medium">{t('attended')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2">{monthName(row.month, 'long')}</td>
                    <td className="py-2 text-end tabular-nums">{format.number(row.attended)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Card>
  );
}

function Categories({ rows }: { rows: CategoryCount[] }) {
  const t = useTranslations('Activity.categories');
  const most = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card className="flex flex-col gap-5 text-start">
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text">{t('title')}</h2>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-background px-4 py-8 text-center text-sm text-text-muted">{t('empty')}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.name} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-text [overflow-wrap:anywhere]">{row.name}</span>
                <span className="text-text-muted tabular-nums">{t('count', { count: row.count })}</span>
              </div>
              {/* The bar only echoes the number written above it. */}
              <div aria-hidden className="h-2.5 overflow-hidden rounded-lg bg-background">
                <div
                  className="h-full animate-grow-side rounded-e-[4px] bg-primary"
                  style={{ width: `${(row.count / most) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Certificates({ activity: a }: { activity: Activity }) {
  const t = useTranslations('Activity.certificates');
  const dates = useEventDates();

  return (
    <section aria-labelledby="certificates-title" className="flex flex-col gap-4 text-start">
      <div className="flex flex-col gap-1">
        <h2 id="certificates-title" className="type-h2 text-text">
          {t('title')}
        </h2>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>
      {a.certificates.length === 0 ? (
        <Card className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-light text-accent-dark">
            <AwardIcon className="size-5" />
          </span>
          <p className="text-sm text-text-muted">{t('empty')}</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {a.certificates.map((b) => (
            <li key={b.id} className="flex min-w-0">
              <Link
                href={`/certificates/${b.id}`}
                className={`group flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 hover:border-accent/50 hover:shadow-[var(--shadow-card-hover)] ${FOCUS_RING}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-light text-accent-dark transition-transform duration-150 group-hover:scale-105">
                  <AwardIcon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span dir="auto" className="truncate text-start font-bold text-text">
                    {b.event.title}
                  </span>
                  <span className="text-xs text-text-muted">
                    {dates.day(b.event.startsAt)}
                    {typeof b.myRating === 'number' ? (
                      <span className="ms-2 inline-flex items-center gap-0.5 align-middle">
                        <StarIcon filled className="size-3.5 text-accent" />
                        {b.myRating}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-medium text-primary">{t('open')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

