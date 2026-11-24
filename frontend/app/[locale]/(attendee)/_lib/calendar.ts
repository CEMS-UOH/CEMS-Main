// Pure calendar helpers for the attendee screens - no React, no fetch - so they are unit tested
// (calendar.test.mjs). OWNER: Role 4.
//
// Days are campus days (Asia/Riyadh, UTC+3, no daylight saving): an event at 01:00 on campus
// belongs to that campus day even though it is still the previous day in UTC.

const CAMPUS_OFFSET_MS = 3 * 60 * 60 * 1000;

/** "2026-11-24" for an instant, in campus time. */
export function campusDayKey(iso: string | Date): string {
  const t = (typeof iso === 'string' ? new Date(iso) : iso).getTime() + CAMPUS_OFFSET_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** "2026-11" for an instant, in campus time. */
export const campusMonthKey = (iso: string | Date) => campusDayKey(iso).slice(0, 7);

/** The month before or after "YYYY-MM". */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type CalendarDay = { key: string; inMonth: boolean };

/**
 * The days shown for a month view: whole weeks, Sunday first (the Saudi working week starts on
 * Sunday), from the week holding the 1st to the week holding the last day - 5 or 6 rows.
 */
export function monthGrid(month: string): CalendarDay[][] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const end = new Date(last);
  end.setUTCDate(last.getUTCDate() + (6 - last.getUTCDay()));

  const weeks: CalendarDay[][] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ key: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === m - 1 });
  }
  return weeks;
}

/** Groups items by the campus day they start on, each day's items in start order. */
export function byCampusDay<T extends { startsAt: string }>(items: T[]): Map<string, T[]> {
  const days = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt))) {
    const key = campusDayKey(item.startsAt);
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return days;
}

// --- "Add to my calendar" ---------------------------------------------------------------

type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  url: string;
};

/** 20261124T150000Z - the UTC form both iCalendar and Google Calendar take. */
const utcStamp = (iso: string | Date) =>
  new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** iCalendar TEXT escaping (RFC 5545 3.3.11). */
const icsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 octets are folded: a CRLF then a space (RFC 5545 3.1). */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  out.push(current);
  return out.join('\r\n ');
}

/** A one-event .ics file: opens in Apple Calendar, Outlook, and Google Calendar (import). */
export function toIcs(event: CalendarEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//University of Hail//Smart Campus Event Manager System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@scems`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(event.startsAt)}`,
    `DTEND:${utcStamp(event.endsAt)}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(`${event.description}\n\n${event.url}`)}`,
    ...(event.location ? [`LOCATION:${icsText(event.location)}`] : []),
    `URL:${event.url}`,
    // A reminder an hour before, in whichever calendar it lands.
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(event.title)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** A link that opens Google Calendar's "new event" screen, already filled in. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${utcStamp(event.startsAt)}/${utcStamp(event.endsAt)}`,
    details: `${event.description.slice(0, 1000)}\n\n${event.url}`,
    ...(event.location ? { location: event.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
