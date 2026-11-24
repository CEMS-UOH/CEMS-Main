// Unit tests for activity.ts. Run: cd frontend && npm run test:attendee
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeActivity } from './activity.ts';

const NOW = new Date('2026-11-24T12:00:00Z');

let n = 0;
function booking({ starts, hours = 2, status = 'CONFIRMED', eventStatus = 'APPROVED', checkedIn = false, category = 'Workshops', rating }) {
  n += 1;
  const startsAt = new Date(starts).toISOString();
  return {
    id: `b${n}`,
    status,
    qrCode: null,
    checkedInAt: checkedIn ? startsAt : null,
    createdAt: startsAt,
    canCancel: false,
    myRating: rating ?? null,
    event: {
      id: `e${n}`,
      title: `Event ${n}`,
      startsAt,
      endsAt: new Date(new Date(starts).getTime() + hours * 3_600_000).toISOString(),
      status: eventStatus,
      imageUrl: null,
      category: { id: category, name: category },
      venue: null,
    },
  };
}

test('nothing booked: zeros, no rate, six empty months ending this month', () => {
  const a = summarizeActivity([], NOW);
  assert.equal(a.attended, 0);
  assert.equal(a.hours, 0);
  assert.equal(a.attendanceRate, null);
  assert.equal(a.averageRating, null);
  assert.equal(a.next, null);
  assert.deepEqual(a.byMonth.map((m) => m.month), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
});

test('counts attended, hours, rate, upcoming and the next seat', () => {
  const list = [
    booking({ starts: '2026-11-02T10:00:00Z', hours: 2, checkedIn: true, rating: 5 }),
    booking({ starts: '2026-10-15T10:00:00Z', hours: 1.5, checkedIn: true, category: 'Sports', rating: 4 }),
    booking({ starts: '2026-10-20T10:00:00Z' }), // booked, did not come
    booking({ starts: '2026-12-05T10:00:00Z' }), // upcoming, later
    booking({ starts: '2026-11-30T10:00:00Z', category: 'Sports' }), // upcoming, sooner
    booking({ starts: '2026-11-10T10:00:00Z', status: 'CANCELLED' }), // cancelled seat: ignored
    booking({ starts: '2026-11-12T10:00:00Z', eventStatus: 'CANCELLED' }), // cancelled event: ignored
  ];
  const a = summarizeActivity(list, NOW);
  assert.equal(a.attended, 2);
  assert.equal(a.hours, 3.5);
  assert.equal(a.upcoming, 2);
  assert.equal(a.next.event.startsAt, '2026-11-30T10:00:00.000Z');
  assert.equal(a.attendanceRate, 2 / 3);
  assert.equal(a.ratingsGiven, 2);
  assert.equal(a.averageRating, 4.5);
  assert.deepEqual(a.categories, [
    { name: 'Workshops', count: 3 },
    { name: 'Sports', count: 2 },
  ]);
  assert.deepEqual(a.certificates.map((b) => b.event.startsAt.slice(0, 10)), ['2026-11-02', '2026-10-15']);
  assert.deepEqual(a.byMonth.slice(-2), [
    { month: '2026-10', attended: 1 },
    { month: '2026-11', attended: 1 },
  ]);
});

test('months follow campus time: 22:00 UTC on Oct 31 is November on campus', () => {
  const a = summarizeActivity([booking({ starts: '2026-10-31T22:00:00Z', checkedIn: true })], NOW);
  assert.equal(a.byMonth.find((m) => m.month === '2026-11').attended, 1);
  assert.equal(a.byMonth.find((m) => m.month === '2026-10').attended, 0);
});

test('an attended event older than the window still counts in the totals', () => {
  const a = summarizeActivity([booking({ starts: '2025-01-10T10:00:00Z', checkedIn: true })], NOW);
  assert.equal(a.attended, 1);
  assert.ok(a.byMonth.every((m) => m.attended === 0));
});
