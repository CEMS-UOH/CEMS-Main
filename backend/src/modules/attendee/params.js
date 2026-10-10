// Small validators for attendee route params and query strings.
// Kept in this module because nothing outside FR-03..FR-09 needs them yet.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

// The university is in Saudi Arabia (UTC+3, no daylight saving), so "events on 2026-11-02"
// means that calendar day in Hail, not in UTC.
const CAMPUS_UTC_OFFSET = '+03:00';
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-02" -> { start, end } of that campus day, or null if it is not a real date. */
function parseCampusDay(value) {
  const match = typeof value === 'string' && DATE_RE.exec(value);
  if (!match) return null;

  const start = new Date(`${value}T00:00:00${CAMPUS_UTC_OFFSET}`);
  if (Number.isNaN(start.getTime())) return null;

  // Reject dates the parser silently rolls over (2026-02-30 -> 2026-03-02).
  const local = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const [, y, m, d] = match.map(Number);
  if (local.getUTCFullYear() !== y || local.getUTCMonth() + 1 !== m || local.getUTCDate() !== d) {
    return null;
  }

  return { start, end: new Date(start.getTime() + DAY_MS) };
}

/** A positive whole number from a query string, `fallback` when absent, null when invalid. */
function parsePositiveInt(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && Number.isSafeInteger(n) ? n : null;
}

module.exports = { isUuid, parseCampusDay, parsePositiveInt };
