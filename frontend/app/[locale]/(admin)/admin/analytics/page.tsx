'use client';

// FR-20: how the system is used. Calls GET /api/admin/analytics (numbers computed by the
// backend from the database) and GET /api/admin/analytics/predictions (expected turnout, from
// the Python analytics service - optional; the rest of the page never waits for it).
//
// Charts are plain HTML, no chart library: one column chart (bookings per month) and bars
// inside tables. Every number a chart shows is also written out (labels, tooltips on hover
// and keyboard focus, and a table view), so nothing depends on seeing the colours.
import { useFormatter, useTranslations } from 'next-intl';
import Card from '@/components/Card';
import PageHeader from '@/components/PageHeader';
import { StarIcon } from '@/components/Icons';
import { FOCUS_RING } from '@/components/styles';
import { CAMPUS_TIME_ZONE } from '../../../_dashboard/lib/campusTime';
import { useApiQuery } from '../../../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../../../_dashboard/lib/useDashboardError';
import StatTile, { StatGrid } from '../../../_dashboard/ui/StatTile';
import { ErrorState, LoadingState } from '../../../_dashboard/ui/States';
import {
  getAnalytics,
  getPredictions,
  type AnalyticsOverview,
  type AttendancePredictions,
} from '../../_lib/admin-api';

/** A round number at or above `value` for the top of an axis: 1, 2, 2.5, 5 x 10^n. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

/** Middle of the month, so the time zone can never push it into the next or previous one. */
const monthDate = (month: string) => new Date(`${month}-15T12:00:00Z`);

export default function AdminAnalyticsPage() {
  const t = useTranslations('Admin.analytics');
  const format = useFormatter();
  const overview = useApiQuery('admin-analytics', getAnalytics);

  const percent = (value: number | null) =>
    value === null ? '—' : format.number(value, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {overview.loading ? (
        <LoadingState />
      ) : overview.errorCode || !overview.data ? (
        <ErrorState code={overview.errorCode ?? 'UNKNOWN'} onRetry={overview.reload} />
      ) : (
        <div className={`flex flex-col gap-8 ${overview.refreshing ? 'opacity-60' : ''}`}>
          <Totals data={overview.data} percent={percent} />
          <MonthChart rows={overview.data.byMonth} />
          <Categories rows={overview.data.byCategory} />
          <TopEvents rows={overview.data.topEvents} percent={percent} />
        </div>
      )}

      <Predictions />
    </>
  );
}

// ------------------------------------------------------------------------------- totals

function Totals({ data, percent }: { data: AnalyticsOverview; percent: (v: number | null) => string }) {
  const t = useTranslations('Admin.analytics.totals');
  const format = useFormatter();
  const { events, users, bookings, attendance, ratings } = data.totals;
  const n = (value: number) => format.number(value);

  return (
    <section aria-label={t('label')} className="flex flex-col gap-4">
      <StatGrid>
        <StatTile label={t('approvedEvents')} value={n(events.approved)} />
        <StatTile label={t('confirmedBookings')} value={n(bookings.confirmed)} />
        {/* The screen's one gold tile: the share of booked seats that were used. */}
        <StatTile label={t('attendanceRate')} value={percent(attendance.rate)} highlight />
        <StatTile
          label={t('averageRating')}
          value={ratings.average === null ? '—' : format.number(ratings.average, { minimumFractionDigits: 1 })}
        />
      </StatGrid>
      <p className="text-start text-sm text-text-muted">
        {t('details', {
          attendees: users.attendees,
          organizers: users.organizers,
          pending: events.pending,
          cancelled: bookings.cancelled,
          checkedIn: attendance.checkedIn,
          confirmed: attendance.confirmed,
          ratings: ratings.count,
        })}
      </p>
    </section>
  );
}

// --------------------------------------------------------------------------- month chart

function MonthChart({ rows }: { rows: AnalyticsOverview['byMonth'] }) {
  const t = useTranslations('Admin.analytics.months');
  const format = useFormatter();
  const top = niceMax(Math.max(...rows.map((r) => r.bookings)));
  const ticks = [top, top / 2, 0];
  const peak = rows.reduce((best, r) => (r.bookings > best.bookings ? r : best), rows[0]);
  const monthName = (month: string, style: 'short' | 'long') =>
    format.dateTime(monthDate(month), { month: style, year: style === 'long' ? 'numeric' : undefined, timeZone: CAMPUS_TIME_ZONE });

  return (
    <Card className="flex flex-col gap-5 text-start">
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text">{t('title')}</h2>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>

      {/* The plot. Columns grow from one baseline; three hairlines mark 0, half and the top. */}
      <div className="grid grid-cols-[auto_1fr] gap-x-3">
        <div className="flex h-48 flex-col justify-between text-end text-xs text-text-muted tabular-nums" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="-my-2">{format.number(tick, { notation: 'compact' })}</span>
          ))}
        </div>
        <div className="relative h-48">
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <div key={tick} className="h-px bg-border" />
            ))}
          </div>
          <ul className="absolute inset-0 flex items-end justify-around gap-1">
            {rows.map((row) => {
              const height = (row.bookings / top) * 100;
              const label = t('columnLabel', {
                month: monthName(row.month, 'long'),
                bookings: row.bookings,
                events: row.events,
                checkIns: row.checkIns,
              });
              return (
                <li key={row.month} className="group relative flex h-full flex-1 items-end justify-center">
                  {/* The whole slot is the hover and focus target, not just the painted bar. */}
                  <button
                    type="button"
                    aria-label={label}
                    className={`flex h-full w-full cursor-default items-end justify-center rounded-md hover:bg-primary-light/40 ${FOCUS_RING}`}
                  >
                    <span
                      className="block w-full max-w-6 rounded-t-[4px] bg-primary transition-[filter] duration-150 group-hover:brightness-110"
                      style={{ height: `${height}%`, minHeight: row.bookings > 0 ? 2 : 0 }}
                    />
                  </button>
                  {/* Only the busiest month carries its number on the cap; the rest are on hover. */}
                  {row === peak && row.bookings > 0 ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute text-xs font-bold text-text tabular-nums"
                      style={{ bottom: `calc(${height}% + 4px)` }}
                    >
                      {format.number(row.bookings)}
                    </span>
                  ) : null}
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max max-w-48 flex-col gap-0.5 rounded-lg border border-border bg-surface px-3 py-2 text-start text-xs shadow-[var(--shadow-card-hover)] group-focus-within:flex group-hover:flex"
                  >
                    <strong className="text-sm text-text tabular-nums">
                      {t('bookings', { count: row.bookings })}
                    </strong>
                    <span className="text-text-muted">{monthName(row.month, 'long')}</span>
                    <span className="text-text-muted">
                      {t('eventsAndCheckIns', { events: row.events, checkIns: row.checkIns })}
                    </span>
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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="text-xs text-text-muted">
              <tr>
                <th className="py-2 text-start font-medium">{t('month')}</th>
                <th className="py-2 text-end font-medium">{t('events')}</th>
                <th className="py-2 text-end font-medium">{t('bookingsCol')}</th>
                <th className="py-2 text-end font-medium">{t('checkInsCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.month}>
                  <td className="py-2">{monthName(row.month, 'long')}</td>
                  <td className="py-2 text-end tabular-nums">{format.number(row.events)}</td>
                  <td className="py-2 text-end tabular-nums">{format.number(row.bookings)}</td>
                  <td className="py-2 text-end tabular-nums">{format.number(row.checkIns)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

// ---------------------------------------------------------------------------- categories

function Rating({ value }: { value: number | null }) {
  const format = useFormatter();
  if (value === null) return <span className="text-text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <StarIcon filled className="size-4 text-accent" />
      {format.number(value, { minimumFractionDigits: 1 })}
    </span>
  );
}

function Categories({ rows }: { rows: AnalyticsOverview['byCategory'] }) {
  const t = useTranslations('Admin.analytics.categories');
  const format = useFormatter();
  const most = Math.max(1, ...rows.map((r) => r.bookings));

  return (
    <Card padded={false} className="overflow-hidden text-start">
      <div className="flex flex-col gap-1 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="type-h3 text-text">{t('title')}</h2>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>
      <div className="overflow-x-auto px-5 pb-4 sm:px-6">
        <table className="mt-3 w-full min-w-[34rem] text-sm">
          <thead className="text-xs text-text-muted">
            <tr className="border-b border-border">
              <th className="py-2 text-start font-medium">{t('category')}</th>
              <th className="py-2 text-end font-medium">{t('events')}</th>
              <th className="w-2/5 py-2 ps-6 text-start font-medium">{t('bookings')}</th>
              <th className="py-2 text-end font-medium">{t('checkIns')}</th>
              <th className="py-2 text-end font-medium">{t('rating')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3 font-medium text-text [overflow-wrap:anywhere]">{row.name}</td>
                <td className="py-3 text-end tabular-nums">{format.number(row.events)}</td>
                <td className="py-3 ps-6">
                  {/* The bar only echoes the number written beside it. */}
                  <div className="flex items-center gap-3">
                    <div aria-hidden className="h-2.5 flex-1 overflow-hidden rounded-lg bg-background">
                      <div className="h-full rounded-e-[4px] bg-primary" style={{ width: `${(row.bookings / most) * 100}%` }} />
                    </div>
                    <span className="w-10 text-end tabular-nums">{format.number(row.bookings)}</span>
                  </div>
                </td>
                <td className="py-3 text-end tabular-nums">{format.number(row.checkIns)}</td>
                <td className="py-3 text-end">
                  <Rating value={row.averageRating} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------- top events

function TopEvents({ rows, percent }: { rows: AnalyticsOverview['topEvents']; percent: (v: number | null) => string }) {
  const t = useTranslations('Admin.analytics.top');
  const format = useFormatter();
  if (rows.length === 0) return null;

  return (
    <Card padded={false} className="overflow-hidden text-start">
      <div className="flex flex-col gap-1 px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 className="type-h3 text-text">{t('title')}</h2>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>
      <div className="overflow-x-auto px-5 pb-4 sm:px-6">
        <table className="mt-3 w-full min-w-[36rem] text-sm">
          <thead className="text-xs text-text-muted">
            <tr className="border-b border-border">
              <th className="py-2 text-start font-medium">{t('event')}</th>
              <th className="py-2 text-end font-medium">{t('booked')}</th>
              <th className="py-2 text-end font-medium">{t('filled')}</th>
              <th className="py-2 text-end font-medium">{t('attended')}</th>
              <th className="py-2 text-end font-medium">{t('rating')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="py-3">
                  <span className="block font-medium text-text [overflow-wrap:anywhere]">{row.title}</span>
                  <span className="text-xs text-text-muted">
                    {format.dateTime(new Date(row.startsAt), { dateStyle: 'medium', timeZone: CAMPUS_TIME_ZONE })}
                  </span>
                </td>
                <td className="py-3 text-end tabular-nums">
                  {t('ofCapacity', { bookings: row.bookings, capacity: row.capacity })}
                </td>
                <td className="py-3 text-end tabular-nums">{percent(row.fillRate)}</td>
                <td className="py-3 text-end tabular-nums">
                  {new Date(row.endsAt) > new Date() ? (
                    <span className="text-text-muted">{t('notYet')}</span>
                  ) : (
                    percent(row.bookings > 0 ? row.checkIns / row.bookings : null)
                  )}
                </td>
                <td className="py-3 text-end">
                  <Rating value={row.averageRating} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --------------------------------------------------------------------------- predictions

function Predictions() {
  const t = useTranslations('Admin.analytics.predictions');
  const errorMessage = useDashboardError();
  const query = useApiQuery('admin-predictions', getPredictions);

  return (
    <Card className="flex flex-col gap-5 text-start">
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text">{t('title')}</h2>
        <p className="text-sm text-text-muted">{t('subtitle')}</p>
      </div>

      {query.loading ? (
        <p className="text-sm text-text-muted" role="status">
          {t('loading')}
        </p>
      ) : query.errorCode || !query.data ? (
        // Optional part: a quiet note, not an alarm - everything above still works.
        <p className="rounded-lg bg-background px-4 py-3 text-sm text-text-muted">
          {query.errorCode === 'ANALYTICS_UNAVAILABLE' ? t('unavailable') : errorMessage(query.errorCode ?? 'UNKNOWN')}
        </p>
      ) : query.data.predictions.length === 0 ? (
        <p className="text-sm text-text-muted">{t('nothingUpcoming')}</p>
      ) : (
        <PredictionList data={query.data} />
      )}
    </Card>
  );
}

function PredictionList({ data }: { data: AttendancePredictions }) {
  const t = useTranslations('Admin.analytics.predictions');
  const format = useFormatter();
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-text">
          {data.method === 'model'
            ? t('methodModel', { count: data.trainedOn })
            : t('methodBaseline', { count: data.trainedOn })}{' '}
          {data.showUpRate !== null
            ? t('showUp', { rate: format.number(data.showUpRate, { style: 'percent', maximumFractionDigits: 0 }) })
            : null}
        </p>
        {/* Legend: two steps of one green. */}
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-sm bg-primary" />
            {t('legendBooked')}
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="size-3 rounded-sm bg-chart-soft" />
            {t('legendExpected')}
          </li>
        </ul>
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {data.predictions.map((p) => {
          const booked = (p.bookingsSoFar / p.capacity) * 100;
          const extra = (Math.max(0, p.expectedBookings - p.bookingsSoFar) / p.capacity) * 100;
          return (
            <li key={p.eventId} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="font-medium text-text [overflow-wrap:anywhere]">{p.title}</span>
                <span className="text-xs text-text-muted">
                  {format.dateTime(new Date(p.startsAt), { dateStyle: 'medium', timeStyle: 'short', timeZone: CAMPUS_TIME_ZONE })}
                </span>
              </div>
              {/* Capacity is the track; booked-now and expected-on-top are two segments with a
                  2px gap between them. */}
              <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-lg bg-background">
                {booked > 0 ? <div className="h-full rounded-s-[4px] bg-primary" style={{ width: `${booked}%` }} /> : null}
                {extra > 0 ? <div className="h-full rounded-e-[4px] bg-chart-soft" style={{ width: `${extra}%` }} /> : null}
              </div>
              <p className="text-sm text-text-muted tabular-nums">
                {t('row', {
                  booked: p.bookingsSoFar,
                  expected: p.expectedBookings,
                  attend: p.expectedAttendance,
                  capacity: p.capacity,
                })}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
