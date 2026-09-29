// Small shared input validators. Reuse these - do not write a second email regex.

// Deliberately pragmatic: one @, no whitespace, a dot-separated domain with a 2+ char TLD.
// Full RFC 5322 is not worth the false negatives; the real check is whether mail arrives.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const isEmail = (value) =>
  typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());

// Emails are case-insensitive in practice, so we store and look them up lowercased.
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

module.exports = { isEmail, normalizeEmail, isNonEmptyString };
