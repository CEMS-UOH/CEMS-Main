// "My activity" numbers, worked out from the attendee's own bookings (GET /api/attendee/bookings)
// - no extra API. Pure, so it is unit tested (activity.test.mjs). OWNER: Role 4.
import type { Booking } from './attendee-api';
import { campusMonthKey, shiftMonth } from './calendar.ts';

export type MonthCount = { month: string; attended: number };
export type CategoryCount = { name: string; count: number };

export type Activity = {
  /** Seats that were checked in at the door. */
  attended: number;
  /** Hours spent at those events (start to end), one decimal. */
  hours: number;
  /** Confirmed seats for events that have not started. */
  upcoming: number;
  /** Of the confirmed seats whose event is over, the share that was attended (0..1); null if none. */
  attendanceRate: number | null;
  ratingsGiven: number;
  averageRating: number | null;
  /** Where the attendee's confirmed seats are, most first (top 5). */
  categories: CategoryCount[];
  /** Events attended per campus month, the last `months` months ending with this one. */
  byMonth: MonthCount[];
  /** Attended seats, newest first: each one has a certificate. */
  certificates: Booking[];
  /** The soonest upcoming confirmed seat, if any. */
  next: Booking | null;
};

const isLive = (b: Booking) => b.status === 'CONFIRMED' && b.event.status !== 'CANCELLED';
const time = (iso: string) => new Date(iso).getTime();

export function summarizeActivity(bookings: Booking[], now: Date, months = 6): Activity {
  const nowMs = now.getTime();
  const live = bookings.filter(isLive);
  const attendedList = live.filter((b) => b.checkedInAt !== null);
  const upcomingList = live
    .filter((b) => time(b.event.startsAt) > nowMs)
    .sort((a, b) => time(a.event.startsAt) - time(b.event.startsAt));
  const over = live.filter((b) => time(b.event.endsAt) <= nowMs);

  const hours = attendedList.reduce((sum, b) => sum + Math.max(0, time(b.event.endsAt) - time(b.event.startsAt)), 0) / 3_600_000;

  const rated = bookings.filter((b) => typeof b.myRating === 'number') as (Booking & { myRating: number })[];

  const byCategory = new Map<string, number>();
  for (const b of live) byCategory.set(b.event.category.name, (byCategory.get(b.event.category.name) ?? 0) + 1);
  const categories = [...byCategory.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  const thisMonth = campusMonthKey(now);
  const byMonth: MonthCount[] = Array.from({ length: months }, (_, i) => ({
    month: shiftMonth(thisMonth, i - (months - 1)),
    attended: 0,
  }));
  for (const b of attendedList) {
    const row = byMonth.find((m) => m.month === campusMonthKey(b.event.startsAt));
    if (row) row.attended += 1;
  }

  return {
    attended: attendedList.length,
    hours: Math.round(hours * 10) / 10,
    upcoming: upcomingList.length,
    attendanceRate: over.length ? over.filter((b) => b.checkedInAt !== null).length / over.length : null,
    ratingsGiven: rated.length,
    averageRating: rated.length ? Math.round((rated.reduce((s, b) => s + b.myRating, 0) / rated.length) * 10) / 10 : null,
    categories,
    byMonth,
    certificates: [...attendedList].sort((a, b) => time(b.event.startsAt) - time(a.event.startsAt)),
    next: upcomingList[0] ?? null,
  };
}
