// "Recommended for you": upcoming events an Attendee is likely to want, from what they booked
// and how they rated it. OWNER: Role 2.
//
// Deliberately simple and explainable (every suggestion says why it was made):
//   1. Interest profile from the attendee's own history:
//      - each CONFIRMED booking adds 1 to that event's category and organizer;
//      - a rating moves it further: 4-5 stars +1, 1-2 stars -1 (3 is neutral).
//   2. Each upcoming event the attendee can still book is scored:
//        score = 3 x category share + 1 x organizer share + 0.5 x how full it is
//      ("share" = that category's / organizer's part of the attendee's total interest, 0..1;
//       a full-ish event is popular, which is a mild hint, never the main reason).
//   3. With no usable history (a new account), the most-booked upcoming events are shown
//      instead, and the answer says so (basis: "popular").
// Candidates: APPROVED, not started, not full, not already booked by this attendee.
const prisma = require('../../lib/prisma');
const { EVENT_SELECT, toPublicEvent } = require('./shapes');

const MAX_RESULTS = 4;
const MAX_CANDIDATES = 100;
const WEIGHT = { category: 3, organizer: 1, popularity: 0.5 };

/** Adds `amount` to `map[key]`. */
const bump = (map, key, amount) => map.set(key, (map.get(key) ?? 0) + amount);

/** Shares 0..1 of each key in the positive part of the profile. */
function shares(map) {
  let total = 0;
  for (const value of map.values()) if (value > 0) total += value;
  const out = new Map();
  for (const [key, value] of map) out.set(key, total > 0 && value > 0 ? value / total : 0);
  return out;
}

async function recommend(userId, now = new Date()) {
  const [history, ratings, candidates] = await Promise.all([
    prisma.registration.findMany({
      where: { userId, status: 'CONFIRMED' },
      select: { event: { select: { categoryId: true, organizerId: true } } },
    }),
    prisma.feedback.findMany({
      where: { userId },
      select: { rating: true, event: { select: { categoryId: true, organizerId: true } } },
    }),
    prisma.event.findMany({
      where: {
        status: 'APPROVED',
        startsAt: { gt: now },
        // Not one the attendee already holds a seat for.
        registrations: { none: { userId, status: 'CONFIRMED' } },
      },
      select: { ...EVENT_SELECT, organizerId: true, categoryId: true },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      take: MAX_CANDIDATES,
    }),
  ]);

  const byCategory = new Map();
  const byOrganizer = new Map();
  for (const { event } of history) {
    bump(byCategory, event.categoryId, 1);
    bump(byOrganizer, event.organizerId, 1);
  }
  for (const { rating, event } of ratings) {
    const delta = rating >= 4 ? 1 : rating <= 2 ? -1 : 0;
    bump(byCategory, event.categoryId, delta);
    bump(byOrganizer, event.organizerId, delta);
  }
  const categoryShare = shares(byCategory);
  const organizerShare = shares(byOrganizer);
  const hasProfile = [...categoryShare.values()].some((v) => v > 0);

  const open = candidates
    .map((event) => {
      const { organizerId, categoryId, ...rest } = event;
      const publicEvent = toPublicEvent(rest);
      return { publicEvent, organizerId, categoryId };
    })
    .filter(({ publicEvent }) => !publicEvent.isFull);

  const scored = open.map(({ publicEvent, organizerId, categoryId }) => {
    const fill = publicEvent.capacity > 0 ? publicEvent.seatsTaken / publicEvent.capacity : 0;
    const category = categoryShare.get(categoryId) ?? 0;
    const organizer = organizerShare.get(organizerId) ?? 0;
    const score = hasProfile
      ? WEIGHT.category * category + WEIGHT.organizer * organizer + WEIGHT.popularity * fill
      : fill;
    // The strongest part of the score is the reason shown to the attendee.
    const reason = !hasProfile
      ? 'POPULAR'
      : WEIGHT.category * category >= WEIGHT.organizer * organizer && category > 0
        ? 'CATEGORY'
        : organizer > 0
          ? 'ORGANIZER'
          : 'POPULAR';
    return { event: { ...publicEvent, reason }, score, startsAt: publicEvent.startsAt };
  });

  // A profile that matches nothing upcoming falls back to popularity too.
  const useful = hasProfile && scored.some((s) => s.event.reason !== 'POPULAR');

  scored.sort((a, b) => b.score - a.score || a.startsAt - b.startsAt);
  return {
    basis: useful ? 'history' : 'popular',
    events: scored.slice(0, MAX_RESULTS).map((s) => s.event),
  };
}

module.exports = { recommend, MAX_RESULTS };
