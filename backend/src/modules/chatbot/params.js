// Small validators for the chatbot route. Kept local like the other modules' params.js.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const LOCALES = ['ar', 'en'];
const isValidLocale = (value) => LOCALES.includes(value);

// Heuristic fallback when the client does not pass `locale` explicitly: any Arabic script
// character in the message is enough to answer in Arabic, since campus communication is
// otherwise bilingual by default (Arabic first - see frontend i18n/routing.ts).
const ARABIC_RE = /[؀-ۿ]/;
const detectLocale = (text) => (ARABIC_RE.test(text) ? 'ar' : 'en');

module.exports = { isUuid, isNonEmptyString, isValidLocale, detectLocale };
