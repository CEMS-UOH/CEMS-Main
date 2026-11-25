// Unit tests for calendar.ts. Run: cd frontend && npm run test:attendee
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byCampusDay,
  campusDayKey,
  campusMonthKey,
  googleCalendarUrl,
  monthGrid,
  shiftMonth,
  toIcs,
} from './calendar.ts';

test('campus day: 22:30 UTC is already the next day on campus (UTC+3)', () => {
  assert.equal(campusDayKey('2026-11-24T22:30:00Z'), '2026-11-25');
  assert.equal(campusDayKey('2026-11-24T20:59:00Z'), '2026-11-24');
  assert.equal(campusMonthKey('2026-11-30T21:00:00Z'), '2026-12');
});

test('shiftMonth crosses year ends both ways', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-11', 0), '2026-11');
});

test('monthGrid: whole weeks starting on Sunday, covering the whole month', () => {
  const weeks = monthGrid('2026-11'); // 1 Nov 2026 is a Sunday; 30 Nov a Monday
  assert.equal(weeks[0][0].key, '2026-11-01');
  assert.ok(weeks.every((w) => w.length === 7));
  const days = weeks.flat();
  assert.equal(days.filter((d) => d.inMonth).length, 30);
  assert.equal(days.at(-1).key, '2026-12-05');
  assert.equal(days.at(-1).inMonth, false);

  const feb = monthGrid('2026-02'); // 1 Feb 2026 is a Sunday, 28 days: exactly 4 weeks
  assert.equal(feb.length, 4);
  const dec = monthGrid('2026-12'); // starts on a Tuesday
  assert.equal(dec[0][0].key, '2026-11-29');
  assert.equal(dec[0][0].inMonth, false);
});

test('byCampusDay groups by campus start day, in time order', () => {
  const days = byCampusDay([
    { id: 'b', startsAt: '2026-11-24T15:00:00Z' },
    { id: 'a', startsAt: '2026-11-24T09:00:00Z' },
    { id: 'c', startsAt: '2026-11-24T22:00:00Z' }, // 01:00 on the 25th on campus
  ]);
  assert.deepEqual(days.get('2026-11-24').map((e) => e.id), ['a', 'b']);
  assert.deepEqual(days.get('2026-11-25').map((e) => e.id), ['c']);
});

const event = {
  id: 'e1',
  title: 'Workshop: AI, ethics; and you',
  description: 'Line one\nLine two',
  startsAt: '2026-11-29T13:00:00.000Z',
  endsAt: '2026-11-29T15:30:00.000Z',
  location: 'Hall A',
  url: 'https://scems.example/ar/events/e1',
};

test('toIcs: valid single event, escaped text, UTC times, reminder, CRLF', () => {
  const ics = toIcs(event, new Date('2026-11-24T10:00:00Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /DTSTART:20261129T130000Z\r\n/);
  assert.match(ics, /DTEND:20261129T153000Z\r\n/);
  assert.match(ics, /SUMMARY:Workshop: AI\\, ethics\\; and you\r\n/);
  assert.match(ics, /UID:e1@scems/);
  assert.match(ics, /TRIGGER:-PT1H/);
  assert.ok(!/[^\r]\n/.test(ics), 'every line ends in CRLF');
});

test('toIcs folds long lines, also with Arabic (multi-byte) text', () => {
  const ics = toIcs({ ...event, title: 'ورشة عمل: الذكاء الاصطناعي العام (AGI) — أين وصلنا؟ '.repeat(3) });
  for (const line of ics.split('\r\n')) {
    assert.ok(new TextEncoder().encode(line).length <= 75, `line too long: ${line.length}`);
  }
});

test('googleCalendarUrl pre-fills title, dates and place', () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.hostname, 'calendar.google.com');
  assert.equal(url.searchParams.get('action'), 'TEMPLATE');
  assert.equal(url.searchParams.get('dates'), '20261129T130000Z/20261129T153000Z');
  assert.equal(url.searchParams.get('location'), 'Hall A');
  assert.match(url.searchParams.get('details'), /scems\.example/);
});
