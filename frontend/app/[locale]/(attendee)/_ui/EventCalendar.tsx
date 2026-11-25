'use client';

// The events feed as a month calendar (FR-03/FR-04, calendar view). Weeks start on Sunday,
// days are campus days (Asia/Riyadh). On a wide screen each day shows its first events; on a
// phone it shows dots. Choosing a day lists that day's events under the grid; with no day
// chosen, the list is the whole month, day by day.
import { useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import Button from '@/components/Button';
import Card, { cardClasses } from '@/components/Card';
import { BackIcon, CalendarIcon, ForwardIcon, PinIcon } from '@/components/Icons';
import { FOCUS_RING } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import type { AttendeeEvent } from '../_lib/attendee-api';
import { byCampusDay, campusDayKey, campusMonthKey, monthGrid, shiftMonth } from '../_lib/calendar';
import { CAMPUS_TIME_ZONE, useEventDates } from '../_lib/format';
import { CategoryBadge, SeatsBadge } from './Badges';

/** How far ahead the arrows go: a year is more than any event is planned. */
const MONTHS_AHEAD = 12;
/** Events written into a day cell on a wide screen; the rest are "+N more". */
const CHIPS_PER_DAY = 2;

/** A campus day "YYYY-MM-DD" as a Date at noon UTC: safe to format with timeZone UTC. */
const dayDate = (key: string) => new Date(`${key}T12:00:00Z`);

type Props = {
  events: AttendeeEvent[];
  month: string;
  onMonth: (month: string) => void;
};

export default function EventCalendar({ events, month, onMonth }: Props) {
  const t = useTranslations('Events.calendar');
  const format = useFormatter();
  const [selected, setSelected] = useState<string | null>(null);

  const today = campusDayKey(new Date());
  const thisMonth = today.slice(0, 7);
  const weeks = useMemo(() => monthGrid(month), [month]);
  const days = useMemo(() => byCampusDay(events), [events]);

  const monthEvents = useMemo(
    () => events.filter((e) => campusMonthKey(e.startsAt) === month),
    [events, month]
  );
  // The next month after this one that has anything, for the "jump" button on an empty month.
  const nextBusyMonth = useMemo(
    () =>
      events
        .map((e) => campusMonthKey(e.startsAt))
        .filter((m) => m > month)
        .sort()[0] ?? null,
    [events, month]
  );

  const canBack = month > thisMonth;
  const canForward = month < shiftMonth(thisMonth, MONTHS_AHEAD);

  function goMonth(next: string) {
    setSelected(null);
    onMonth(next);
  }

  const title = format.dateTime(dayDate(`${month}-15`), { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const weekdays = weeks[0].map((d) => ({
    short: format.dateTime(dayDate(d.key), { weekday: 'short', timeZone: 'UTC' }),
    narrow: format.dateTime(dayDate(d.key), { weekday: 'narrow', timeZone: 'UTC' }),
    long: format.dateTime(dayDate(d.key), { weekday: 'long', timeZone: 'UTC' }),
  }));

  const agendaDays = selected
    ? [[selected, days.get(selected) ?? []] as const]
    : [...days.entries()].filter(([key]) => key.startsWith(month));

  return (
    <div className="flex flex-col gap-6">
      <Card padded={false} className="overflow-hidden">
        {/* Month bar: the month's name, the count, and the arrows. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex flex-col text-start">
            <h2 className="type-h3 text-text" aria-live="polite">
              {title}
            </h2>
            <p className="text-sm text-text-muted">{t('monthCount', { count: monthEvents.length })}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {month !== thisMonth ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => goMonth(thisMonth)}>
                {t('thisMonth')}
              </Button>
            ) : null}
            <MonthArrow label={t('previous')} disabled={!canBack} onClick={() => goMonth(shiftMonth(month, -1))}>
              {/* "Back" points the way the page reads: right in Arabic, left in English. */}
              <BackIcon />
            </MonthArrow>
            <MonthArrow label={t('next')} disabled={!canForward} onClick={() => goMonth(shiftMonth(month, 1))}>
              <ForwardIcon />
            </MonthArrow>
          </div>
        </div>

        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{t('caption', { month: title })}</caption>
          <thead>
            <tr>
              {weekdays.map((w) => (
                <th
                  key={w.long}
                  scope="col"
                  abbr={w.long}
                  className="border-b border-border py-2 text-center text-xs font-medium text-text-muted"
                >
                  <span className="hidden sm:inline">{w.short}</span>
                  <span className="sm:hidden" aria-hidden>
                    {w.narrow}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week[0].key}>
                {week.map((day) => (
                  <DayCell
                    key={day.key}
                    dayKey={day.key}
                    inMonth={day.inMonth}
                    isToday={day.key === today}
                    isPast={day.key < today}
                    isSelected={day.key === selected}
                    events={days.get(day.key) ?? []}
                    onSelect={() => setSelected(day.key === selected ? null : day.key)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* The list under the grid: one day, or the whole month. */}
      <section aria-labelledby="calendar-agenda" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="calendar-agenda" className="text-start text-sm font-medium text-text-muted" aria-live="polite">
            {selected
              ? format.dateTime(dayDate(selected), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
              : t('agendaMonth', { month: title })}
          </h2>
          {selected ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(null)}>
              {t('showMonth')}
            </Button>
          ) : null}
        </div>

        {agendaDays.length === 0 || agendaDays.every(([, list]) => list.length === 0) ? (
          <Card className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-primary-light text-primary">
              <CalendarIcon className="size-6" />
            </span>
            <p className="font-medium text-text">{selected ? t('emptyDay') : t('emptyMonth')}</p>
            {!selected && nextBusyMonth ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => goMonth(nextBusyMonth)}>
                {t('jumpTo', {
                  month: format.dateTime(dayDate(`${nextBusyMonth}-15`), { month: 'long', year: 'numeric', timeZone: 'UTC' }),
                })}
              </Button>
            ) : null}
          </Card>
        ) : (
          <ol className="flex flex-col gap-6">
            {agendaDays.map(([key, list]) => (
              <li key={key} className="flex flex-col gap-3">
                {selected ? null : (
                  <h3 className="flex items-center gap-2 text-start text-sm font-bold text-text">
                    <span className="grid size-8 place-items-center rounded-md bg-primary-light text-primary-dark tabular-nums">
                      {format.dateTime(dayDate(key), { day: 'numeric', timeZone: 'UTC' })}
                    </span>
                    {format.dateTime(dayDate(key), { weekday: 'long', timeZone: 'UTC' })}
                  </h3>
                )}
                <ul className="flex flex-col gap-2">
                  {list.map((event) => (
                    <li key={event.id} className="flex">
                      <AgendaRow event={event} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function MonthArrow({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid size-9 cursor-pointer place-items-center rounded-md border border-border bg-surface text-text transition-colors duration-150 hover:bg-primary-light hover:text-primary-dark disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-text ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}

type CellProps = {
  dayKey: string;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isSelected: boolean;
  events: AttendeeEvent[];
  onSelect: () => void;
};

function DayCell({ dayKey, inMonth, isToday, isPast, isSelected, events, onSelect }: CellProps) {
  const t = useTranslations('Events.calendar');
  const format = useFormatter();
  const dates = useEventDates();
  const label = format.dateTime(dayDate(dayKey), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  const extra = events.length - CHIPS_PER_DAY;

  return (
    <td
      className={`relative h-14 border-b border-e border-border align-top last:border-e-0 sm:h-28 ${
        inMonth ? 'bg-surface' : 'bg-background'
      }`}
    >
      {/* The whole cell chooses the day; the event chips above it open the event itself. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`${label}${isToday ? ` - ${t('today')}` : ''}: ${t('dayCount', { count: events.length })}`}
        className={`absolute inset-0 cursor-pointer transition-colors duration-150 hover:bg-primary-light/50 ${FOCUS_RING} focus-visible:-outline-offset-2 ${
          isSelected ? 'bg-primary-light/70 ring-2 ring-primary ring-inset' : ''
        }`}
      />

      <div className="pointer-events-none relative flex h-full flex-col items-center gap-1 p-1 sm:items-stretch sm:p-1.5">
        <span
          aria-hidden
          className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums sm:self-start ${
            isToday
              ? 'bg-primary font-bold text-on-fill'
              : !inMonth || isPast
                ? 'text-text-muted/60'
                : 'text-text'
          }`}
        >
          {format.dateTime(dayDate(dayKey), { day: 'numeric', timeZone: 'UTC' })}
        </span>

        {/* Phone: up to three dots. */}
        {events.length > 0 ? (
          <span aria-hidden className="flex gap-0.5 sm:hidden">
            {events.slice(0, 3).map((e) => (
              <span key={e.id} className={`size-1.5 rounded-full ${e.isFull ? 'bg-text-muted' : 'bg-primary'}`} />
            ))}
          </span>
        ) : null}

        {/* Wide screen: the first events, each a link to its page. */}
        <ul className="hidden min-w-0 flex-col gap-1 sm:flex">
          {events.slice(0, CHIPS_PER_DAY).map((event) => (
            <li key={event.id} className="min-w-0">
              <Link
                href={`/events/${event.id}`}
                title={event.title}
                className={`pointer-events-auto block truncate rounded-sm px-1.5 py-0.5 text-start text-xs leading-5 transition-colors duration-150 ${FOCUS_RING} ${
                  event.isFull
                    ? 'bg-background text-text-muted hover:bg-border'
                    : 'bg-primary-light text-primary-dark hover:bg-primary hover:text-on-fill'
                }`}
              >
                <span className="font-bold tabular-nums">
                  {format.dateTime(new Date(event.startsAt), { hour: 'numeric', minute: '2-digit', timeZone: CAMPUS_TIME_ZONE })}
                </span>{' '}
                <bdi>{event.title}</bdi>
                <span className="sr-only">, {dates.range(event.startsAt, event.endsAt)}</span>
              </Link>
            </li>
          ))}
          {extra > 0 ? (
            <li aria-hidden className="px-1.5 text-start text-xs font-medium text-text-muted">
              {t('more', { count: extra })}
            </li>
          ) : null}
        </ul>
      </div>
    </td>
  );
}

/** One event in the list under the grid: time, title, place and seats on one line. */
function AgendaRow({ event }: { event: AttendeeEvent }) {
  const dates = useEventDates();
  return (
    <Link
      href={`/events/${event.id}`}
      className={`group flex w-full animate-fade-in flex-col gap-2 px-4 py-3 text-start sm:flex-row sm:items-center sm:gap-4 ${cardClasses({
        padded: false,
        interactive: true,
      })} ${FOCUS_RING}`}
    >
      <span className="shrink-0 text-sm font-bold text-primary-dark tabular-nums sm:w-40">
        {dates.hours(event.startsAt, event.endsAt)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span dir="auto" className="truncate text-start font-bold text-text transition-colors duration-150 group-hover:text-primary">
          {event.title}
        </span>
        {event.venue ? (
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <PinIcon className="size-3.5 shrink-0" />
            <span dir="auto" className="truncate">{event.venue.name}</span>
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 flex-wrap items-center gap-2">
        <CategoryBadge name={event.category.name} />
        <SeatsBadge event={event} />
      </span>
    </Link>
  );
}
