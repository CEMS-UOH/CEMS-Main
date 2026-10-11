// Small validators for admin route params, queries and bodies.
// Email/name validation is NOT duplicated here - reuse backend/src/lib/validate.js
// ("do not write a second email regex").

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

/** A positive whole number from a query string, `fallback` when absent, null when invalid. */
function parsePositiveInt(value, fallback) {
  if (value === undefined || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && Number.isSafeInteger(n) ? n : null;
}

module.exports = { isUuid, parsePositiveInt };
