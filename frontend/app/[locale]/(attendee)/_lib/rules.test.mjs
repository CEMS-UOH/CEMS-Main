// Unit tests for the attendee screen rules (rules.ts). Run: cd frontend && npm run test:attendee
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingAction,
  bookingTab,
  canGiveFeedback,
  feedQueryString,
  filterOptions,
  findBookingForEvent,
  foldForSearch,
  groupBookings,
  hasActiveFilters,
  parseFeedFilters,
  searchEvents,
  seatsTone,
} from './rules.ts';

const NOW = new Date('2026-10-11T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const at = (hoursFromNow) => new Date(NOW.getTime() + hoursFromNow * HOUR).toISOString();

const CAT_A = { id: 'c1', name: 'Workshop' };
const CAT_B = { id: 'c2', name: 'Seminar' };
const VENUE = { id: 'v1', name: 'Main Hall', building: 'B1', location: null };

const event = (overrides = {}) => ({
  id: 'e1',
  title: 'Intro to AI',
  description: 'Hands-on session',
  startsAt: at(24),
  endsAt: at(26),
  capacity: 100,
  status: 'APPROVED',
  imageUrl: null,
  category: CAT_A,
  venue: VENUE,
  organizer: { id: 'o1', fullName: 'Sara Ahmed' },
  seatsTaken: 10,
  seatsLeft: 90,
  isFull: false,
  ...overrides,
});

const booking = (overrides = {}, eventOverrides = {}) => ({
  id: 'b1',
  status: 'CONFIRMED',
  qrCode: 'token',
  checkedInAt: null,
  createdAt: at(-48),
  canCancel: true,
  ...overrides,
  event: {
    id: 'e1',
    title: 'Intro to AI',
    startsAt: at(24),
    endsAt: at(26),
    status: 'APPROVED',
    imageUrl: null,
    category: CAT_A,
    venue: VENUE,
    ...eventOverrides,
  },
});

const ATTENDEE = { status: 'user', role: 'ATTENDEE' };

test('bookingAction: an attendee can book an upcoming event with seats', () => {
  assert.equal(bookingAction(event(), null, ATTENDEE, NOW), 'can-book');
});

test('bookingAction: priority is ended > booked > started > full > session', () => {
  const ended = event({ startsAt: at(-3), endsAt: at(-1) });
  assert.equal(bookingAction(ended, booking(), ATTENDEE, NOW), 'ended');

  const started = event({ startsAt: at(-1), endsAt: at(1), isFull: true });
  assert.equal(bookingAction(started, booking(), ATTENDEE, NOW), 'booked');
  assert.equal(bookingAction(started, null, ATTENDEE, NOW), 'started');

  const full = event({ isFull: true, seatsLeft: 0 });
  assert.equal(bookingAction(full, null, { status: 'guest' }, NOW), 'full');
});

test('bookingAction: a cancelled booking does not count as booked', () => {
  assert.equal(bookingAction(event(), booking({ status: 'CANCELLED' }), ATTENDEE, NOW), 'can-book');
});

test('bookingAction: guests are asked to log in, organizers and admins cannot book', () => {
  assert.equal(bookingAction(event(), null, { status: 'loading' }, NOW), 'loading');
  assert.equal(bookingAction(event(), null, { status: 'guest' }, NOW), 'guest');
  assert.equal(bookingAction(event(), null, { status: 'user', role: 'ORGANIZER' }, NOW), 'not-attendee');
  assert.equal(bookingAction(event(), null, { status: 'user', role: 'ADMIN' }, NOW), 'not-attendee');
});

test('findBookingForEvent returns only a confirmed booking for that event', () => {
  const list = [
    booking({ id: 'old', status: 'CANCELLED' }),
    booking({ id: 'other' }, { id: 'e2' }),
    booking({ id: 'live' }),
  ];
  assert.equal(findBookingForEvent(list, 'e1')?.id, 'live');
  assert.equal(findBookingForEvent(list, 'e3'), null);
  assert.equal(findBookingForEvent([booking({ status: 'CANCELLED' })], 'e1'), null);
});

test('bookingTab and groupBookings split the history into upcoming, past and cancelled', () => {
  const soon = booking({ id: 'soon' }, { startsAt: at(2), endsAt: at(3) });
  const later = booking({ id: 'later' }, { startsAt: at(48), endsAt: at(50) });
  const done = booking({ id: 'done', canCancel: false }, { startsAt: at(-5), endsAt: at(-3) });
  const running = booking({ id: 'running', canCancel: false }, { startsAt: at(-1), endsAt: at(1) });
  const mine = booking({ id: 'mine', status: 'CANCELLED', qrCode: null });
  const theirs = booking({ id: 'theirs' }, { status: 'CANCELLED' });

  assert.equal(bookingTab(running, NOW), 'upcoming');
  assert.equal(bookingTab(theirs, NOW), 'cancelled');

  // The API sends newest event first.
  const groups = groupBookings([later, soon, running, done, mine, theirs], NOW);
  assert.deepEqual(groups.upcoming.map((b) => b.id), ['running', 'soon', 'later']);
  assert.deepEqual(groups.past.map((b) => b.id), ['done']);
  assert.deepEqual(groups.cancelled.map((b) => b.id), ['mine', 'theirs']);
});

test('canGiveFeedback: only a confirmed seat at an approved event that has ended', () => {
  const ended = { startsAt: at(-5), endsAt: at(-3) };
  assert.equal(canGiveFeedback(booking({}, ended), NOW), true);
  assert.equal(canGiveFeedback(booking(), NOW), false);
  assert.equal(canGiveFeedback(booking({ status: 'CANCELLED' }, ended), NOW), false);
  assert.equal(canGiveFeedback(booking({}, { ...ended, status: 'CANCELLED' }), NOW), false);
});

test('seatsTone flags full events and the last seats', () => {
  assert.equal(seatsTone({ capacity: 100, seatsLeft: 0, isFull: true }), 'full');
  assert.equal(seatsTone({ capacity: 100, seatsLeft: 10, isFull: false }), 'low');
  assert.equal(seatsTone({ capacity: 100, seatsLeft: 11, isFull: false }), 'ok');
  assert.equal(seatsTone({ capacity: 500, seatsLeft: 30, isFull: false }), 'ok');
  assert.equal(seatsTone({ capacity: 500, seatsLeft: 10, isFull: false }), 'low');
  assert.equal(seatsTone({ capacity: 5, seatsLeft: 1, isFull: false }), 'low');
});

test('filterOptions lists each category and venue once, sorted by name', () => {
  const hall = { id: 'v2', name: 'Auditorium', building: null, location: null };
  const options = filterOptions(
    [event(), event({ id: 'e2', category: CAT_B, venue: hall }), event({ id: 'e3', venue: null })],
    'en'
  );
  assert.deepEqual(options.categories.map((c) => c.name), ['Seminar', 'Workshop']);
  assert.deepEqual(options.venues.map((v) => v.name), ['Auditorium', 'Main Hall']);
});

test('foldForSearch ignores case, Arabic diacritics and common spelling variants', () => {
  assert.equal(foldForSearch('  Intro   TO AI '), 'intro to ai');
  assert.equal(foldForSearch('وَرْشَةُ'), foldForSearch('ورشه'));
  assert.equal(foldForSearch('أحمد'), foldForSearch('احمد'));
  assert.equal(foldForSearch('إسلام'), foldForSearch('اسلام'));
  assert.equal(foldForSearch('مستشفى'), foldForSearch('مستشفي'));
  assert.equal(foldForSearch('ـــمحاضرة'), foldForSearch('محاضره'));
});

test('searchEvents matches every word across title, description, category, venue and organizer', () => {
  const list = [
    event({ id: 'a', title: 'ورشة الذكاء الاصطناعي' }),
    event({ id: 'b', title: 'Robotics', category: CAT_B, organizer: { id: 'o2', fullName: 'Omar' } }),
  ];
  assert.deepEqual(searchEvents(list, '').map((e) => e.id), ['a', 'b']);
  assert.deepEqual(searchEvents(list, 'ورشه الذكاء').map((e) => e.id), ['a']);
  assert.deepEqual(searchEvents(list, 'seminar omar').map((e) => e.id), ['b']);
  assert.deepEqual(searchEvents(list, 'main hall').map((e) => e.id), ['a', 'b']);
  assert.deepEqual(searchEvents(list, 'robotics workshop').map((e) => e.id), []);
});

test('parseFeedFilters keeps valid filters and drops malformed ones', () => {
  const uuid = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
  const params = (entries) => new URLSearchParams(entries);
  assert.deepEqual(parseFeedFilters(params({ category: uuid, date: '2026-10-12', page: '3' })), {
    category: uuid,
    venue: '',
    date: '2026-10-12',
    page: 3,
  });
  assert.deepEqual(parseFeedFilters(params({ category: 'x', venue: '1', date: '12/10', page: '-2' })), {
    category: '',
    venue: '',
    date: '',
    page: 1,
  });
  assert.equal(parseFeedFilters(params({ page: '1.5' })).page, 1);
});

test('feedQueryString leaves out page 1 and empty filters', () => {
  assert.equal(feedQueryString({ category: '', venue: '', date: '', page: 1 }), '');
  assert.equal(
    feedQueryString({ category: 'c', venue: '', date: '2026-10-12', page: 2 }),
    '?category=c&date=2026-10-12&page=2'
  );
  assert.equal(hasActiveFilters({ category: '', venue: '', date: '', page: 4 }), false);
  assert.equal(hasActiveFilters({ category: '', venue: 'v', date: '', page: 1 }), true);
});
