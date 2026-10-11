// Small validators for organizer route params and bodies.
// Kept in this module like attendee/params.js - nothing outside FR-10..FR-16 needs them.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** A positive whole number from a query string, `fallback` when absent, null when invalid. */
function parsePositiveInt(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && Number.isSafeInteger(n) ? n : null;
}

/** A finite positive integer from a request BODY value (not a query string). */
function isPositiveInteger(value) {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// http(s) only - FR-16 explicitly says validated http(s) URLs, not arbitrary schemes
// (javascript:, data:, file:, ... are all rejected).
function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** A real, parseable Date from an ISO-ish string, or null. */
function parseDate(value) {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = {
  isUuid,
  parsePositiveInt,
  isPositiveInteger,
  isNonEmptyString,
  isHttpUrl,
  parseDate,
};
