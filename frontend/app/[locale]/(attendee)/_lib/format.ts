'use client';

// Event dates for the attendee screens. The API sends UTC; the university is in Saudi Arabia
// (UTC+3, no daylight saving), so every date is shown in campus time whatever the device's own
// time zone - the same convention the API's ?date= filter uses (backend attendee/params.js).
import { useFormatter } from 'next-intl';

export const CAMPUS_TIME_ZONE = 'Asia/Riyadh';

const RANGE = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: CAMPUS_TIME_ZONE,
} as const;

const TIME = { hour: 'numeric', minute: '2-digit', timeZone: CAMPUS_TIME_ZONE } as const;
const DAY = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: CAMPUS_TIME_ZONE } as const;
const DAY_KEY = { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: CAMPUS_TIME_ZONE } as const;
const DAY_NUMBER = { day: 'numeric', timeZone: CAMPUS_TIME_ZONE } as const;
const MONTH_SHORT = { month: 'short', timeZone: CAMPUS_TIME_ZONE } as const;

export function useEventDates() {
  const format = useFormatter();
  return {
    /** "Sun, Oct 12, 6:30 – 8:00 PM", or both dates when the event spans several days. */
    range: (startsAt: string, endsAt: string) =>
      format.dateTimeRange(new Date(startsAt), new Date(endsAt), RANGE),
    /** "6:30 – 8:00 PM" when the event starts and ends on the same campus day, else the full range. */
    hours: (startsAt: string, endsAt: string) => {
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      const sameDay = format.dateTime(start, DAY_KEY) === format.dateTime(end, DAY_KEY);
      return format.dateTimeRange(start, end, sameDay ? TIME : RANGE);
    },
    /** "Sunday, October 12, 2026" */
    day: (iso: string) => format.dateTime(new Date(iso), DAY),
    /** The two halves of a calendar-style date badge: "12" and "Oct". */
    badge: (iso: string) => ({
      day: format.dateTime(new Date(iso), DAY_NUMBER),
      month: format.dateTime(new Date(iso), MONTH_SHORT),
    }),
  };
}
