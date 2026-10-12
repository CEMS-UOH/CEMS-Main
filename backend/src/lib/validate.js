// Small shared input validators. Reuse these - do not write a second email regex.

// Deliberately pragmatic: one @, no whitespace, a dot-separated domain with a 2+ char TLD.
// Full RFC 5322 is not worth the false negatives; the real check is whether mail arrives.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

const isEmail = (value) =>
  typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value.trim());

// Emails are case-insensitive in practice, so we store and look them up lowercased.
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// Phone numbers: people type them with spaces, dashes and brackets, so those are stripped
// before checking and storing. What is left must be 8-15 digits with an optional leading +
// (the international E.164 length range), which accepts "0512345678" and "+966512345678"
// alike. Deliberately not tied to one country's format.
const PHONE_RE = /^\+?[0-9]{8,15}$/;

// Arabic keyboards type Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩); they are stored as 0-9.
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

const normalizePhone = (value) =>
  String(value || '')
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[\s\-().]/g, '');

const isPhone = (value) => typeof value === 'string' && PHONE_RE.test(normalizePhone(value));

module.exports = { isEmail, normalizeEmail, isNonEmptyString, isPhone, normalizePhone };
