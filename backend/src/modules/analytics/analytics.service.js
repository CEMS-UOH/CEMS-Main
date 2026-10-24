// FR-20: system analytics for the Admin. OWNER: Role 6.
//
// Two parts:
// - getOverview(): descriptive numbers computed here, straight from the database (counts,
//   attendance, ratings, by category, by month, top events). Works with nothing else running.
// - getPredictions(): expected turnout of upcoming events. The model lives in the Python
//   analytics service (analytics/app); this sends it the history and the upcoming events and
//   passes its answer on. The Python service never needs database credentials.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');
// Read at call time (not destructured) so the setting can change without reloading the module.
const env = require('../../config/env');

const CAMPUS_TZ = 'Asia/Riyadh';
const TOP_EVENTS = 5;
// The month chart: five months back, this month, and two ahead (approved events are often
// booked weeks before they happen).
const MONTHS_BACK = 5;
const MONTHS_AHEAD = 2;
// Long enough for a free hosting plan to wake the service up (it sleeps when idle).
const PREDICTION_TIMEOUT_MS = 25000;
const MAX_HISTORY = 500;

const rate = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 1000 : null);
const countsBy = (rows, key) =>
  Object.fromEntries(rows.map((row) => [row[key], row._count._all]));

/** "2026-10" for a Date, in campus time. */
function campusMonth(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CAMPUS_TZ, year: 'numeric', month: '2-digit' })
    .formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}`;
}

/** The list of months the chart covers, oldest first, e.g. ["2026-05", ..., "2026-12"]. */
function monthWindow(now) {
  const [year, month] = campusMonth(now).split('-').map(Number);
  const months = [];
  for (let offset = -MONTHS_BACK; offset <= MONTHS_AHEAD; offset++) {
    const d = new Date(Date.UTC(year, month - 1 + offset, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

async function getOverview(now = new Date()) {
  const months = monthWindow(now);
  // First instant of the first month in the window, campus time (UTC+3, no daylight saving).
  const since = new Date(`${months[0]}-01T00:00:00+03:00`);

  const [
    eventsByStatus,
    usersByRole,
    bookingsByStatus,
    ratings,
    [attendance],
    byCategory,
    categoryRatings,
    byMonth,
    topEvents,
  ] = await Promise.all([
    prisma.event.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.registration.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    // Attendance only counts events that are over: a seat at a future event cannot be used yet.
    prisma.$queryRaw`
      SELECT count(*)::int AS "confirmed",
             count(*) FILTER (WHERE r."checkedInAt" IS NOT NULL)::int AS "checkedIn"
      FROM registrations r
      JOIN events e ON e.id = r."eventId"
      WHERE r.status = 'CONFIRMED' AND e.status = 'APPROVED' AND e."endsAt" < ${now}`,
    prisma.$queryRaw`
      SELECT c.id, c.name,
             count(DISTINCT e.id)::int AS "events",
             count(r.id) FILTER (WHERE r.status = 'CONFIRMED')::int AS "bookings",
             count(r.id) FILTER (WHERE r.status = 'CONFIRMED' AND r."checkedInAt" IS NOT NULL)::int AS "checkIns"
      FROM categories c
      LEFT JOIN events e ON e."categoryId" = c.id AND e.status = 'APPROVED'
      LEFT JOIN registrations r ON r."eventId" = e.id
      GROUP BY c.id, c.name
      ORDER BY "bookings" DESC, c.name ASC`,
    prisma.$queryRaw`
      SELECT e."categoryId" AS id,
             round(avg(f.rating)::numeric, 1)::float AS "averageRating",
             count(*)::int AS "ratings"
      FROM feedbacks f
      JOIN events e ON e.id = f."eventId"
      GROUP BY e."categoryId"`,
    prisma.$queryRaw`
      SELECT to_char(e."startsAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Riyadh', 'YYYY-MM') AS "month",
             count(DISTINCT e.id)::int AS "events",
             count(r.id) FILTER (WHERE r.status = 'CONFIRMED')::int AS "bookings",
             count(r.id) FILTER (WHERE r.status = 'CONFIRMED' AND r."checkedInAt" IS NOT NULL)::int AS "checkIns"
      FROM events e
      LEFT JOIN registrations r ON r."eventId" = e.id
      WHERE e.status = 'APPROVED' AND e."startsAt" >= ${since}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT e.id, e.title, e."startsAt", e."endsAt", e.capacity,
             count(r.id) FILTER (WHERE r.status = 'CONFIRMED')::int AS "bookings",
             count(r.id) FILTER (WHERE r.status = 'CONFIRMED' AND r."checkedInAt" IS NOT NULL)::int AS "checkIns",
             (SELECT round(avg(f.rating)::numeric, 1)::float FROM feedbacks f WHERE f."eventId" = e.id) AS "averageRating"
      FROM events e
      LEFT JOIN registrations r ON r."eventId" = e.id
      WHERE e.status = 'APPROVED'
      GROUP BY e.id
      ORDER BY "bookings" DESC, e."startsAt" DESC
      LIMIT ${TOP_EVENTS}`,
  ]);

  const events = countsBy(eventsByStatus, 'status');
  const users = countsBy(usersByRole, 'role');
  const bookings = countsBy(bookingsByStatus, 'status');
  const ratingById = new Map(categoryRatings.map((row) => [row.id, row]));
  const monthRows = new Map(byMonth.map((row) => [row.month, row]));

  return {
    totals: {
      events: {
        total: eventsByStatus.reduce((sum, row) => sum + row._count._all, 0),
        pending: events.PENDING ?? 0,
        approved: events.APPROVED ?? 0,
        rejected: events.REJECTED ?? 0,
        cancelled: events.CANCELLED ?? 0,
      },
      users: {
        total: usersByRole.reduce((sum, row) => sum + row._count._all, 0),
        attendees: users.ATTENDEE ?? 0,
        organizers: users.ORGANIZER ?? 0,
        admins: users.ADMIN ?? 0,
      },
      bookings: { confirmed: bookings.CONFIRMED ?? 0, cancelled: bookings.CANCELLED ?? 0 },
      attendance: {
        confirmed: attendance.confirmed,
        checkedIn: attendance.checkedIn,
        rate: rate(attendance.checkedIn, attendance.confirmed),
      },
      ratings: {
        count: ratings._count._all,
        average: ratings._avg.rating === null ? null : Math.round(ratings._avg.rating * 10) / 10,
      },
    },
    byCategory: byCategory.map((row) => ({
      id: row.id,
      name: row.name,
      events: row.events,
      bookings: row.bookings,
      checkIns: row.checkIns,
      averageRating: ratingById.get(row.id)?.averageRating ?? null,
      ratings: ratingById.get(row.id)?.ratings ?? 0,
    })),
    byMonth: months.map((month) => ({
      month,
      events: monthRows.get(month)?.events ?? 0,
      bookings: monthRows.get(month)?.bookings ?? 0,
      checkIns: monthRows.get(month)?.checkIns ?? 0,
    })),
    topEvents: topEvents.map((row) => ({
      id: row.id,
      title: row.title,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      capacity: row.capacity,
      bookings: row.bookings,
      checkIns: row.checkIns,
      fillRate: rate(row.bookings, row.capacity),
      averageRating: row.averageRating,
    })),
    generatedAt: now,
  };
}

/** Hour of day and weekday (0 = Sunday) of a date, in campus time. */
function campusClock(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAMPUS_TZ,
    hour: 'numeric',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.find((p) => p.type === 'weekday').value
  );
  return { hour, weekday };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The numbers the model learns from, for one event. No personal data, no titles. */
function features(event) {
  const { hour, weekday } = campusClock(event.startsAt);
  return {
    eventId: event.id,
    category: event.category.name,
    capacity: event.capacity,
    weekday,
    hour,
    durationHours: Math.max(0, (event.endsAt - event.startsAt) / 3600000),
    leadDays: Math.max(0, (event.startsAt - event.createdAt) / DAY_MS),
  };
}

const EVENT_FOR_MODEL = {
  id: true,
  title: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  capacity: true,
  category: { select: { name: true } },
};

async function getPredictions(now = new Date()) {
  const { analyticsUrl } = env;
  if (!analyticsUrl) {
    throw new HttpError(503, 'The analytics service is not configured', 'ANALYTICS_UNAVAILABLE');
  }

  const [past, upcoming] = await Promise.all([
    prisma.event.findMany({
      where: { status: 'APPROVED', endsAt: { lt: now } },
      select: {
        ...EVENT_FOR_MODEL,
        _count: {
          select: { registrations: { where: { status: 'CONFIRMED' } } },
        },
        registrations: { where: { status: 'CONFIRMED', checkedInAt: { not: null } }, select: { id: true } },
      },
      orderBy: { startsAt: 'desc' },
      take: MAX_HISTORY,
    }),
    prisma.event.findMany({
      where: { status: 'APPROVED', startsAt: { gt: now } },
      select: {
        ...EVENT_FOR_MODEL,
        _count: { select: { registrations: { where: { status: 'CONFIRMED' } } } },
      },
      orderBy: { startsAt: 'asc' },
      take: 50,
    }),
  ]);

  if (upcoming.length === 0) return { method: 'none', trainedOn: past.length, predictions: [] };

  let response;
  try {
    response = await fetch(`${analyticsUrl.replace(/\/+$/, '')}/predict-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.analyticsToken ? { 'X-Analytics-Token': env.analyticsToken } : {}),
      },
      body: JSON.stringify({
        history: past.map((e) => ({
          ...features(e),
          bookings: e._count.registrations,
          checkIns: e.registrations.length,
        })),
        upcoming: upcoming.map((e) => ({ ...features(e), bookings: e._count.registrations })),
      }),
      signal: AbortSignal.timeout(PREDICTION_TIMEOUT_MS),
    });
  } catch (e) {
    console.error(`[analytics] prediction service unreachable: ${e.message}`);
    throw new HttpError(503, 'The analytics service is not available', 'ANALYTICS_UNAVAILABLE');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success || !Array.isArray(body.data?.predictions)) {
    console.error(`[analytics] prediction service answered ${response.status}`);
    throw new HttpError(503, 'The analytics service is not available', 'ANALYTICS_UNAVAILABLE');
  }

  // Put the titles and dates back next to each number - the model only ever saw ids.
  const byId = new Map(upcoming.map((e) => [e.id, e]));
  return {
    method: body.data.method,
    trainedOn: body.data.trainedOn,
    showUpRate: body.data.showUpRate,
    predictions: body.data.predictions
      .filter((p) => byId.has(p.eventId))
      .map((p) => {
        const e = byId.get(p.eventId);
        return {
          eventId: e.id,
          title: e.title,
          startsAt: e.startsAt,
          capacity: e.capacity,
          bookingsSoFar: e._count.registrations,
          expectedBookings: p.expectedBookings,
          expectedAttendance: p.expectedAttendance,
        };
      }),
  };
}

module.exports = { getOverview, getPredictions, monthWindow };
