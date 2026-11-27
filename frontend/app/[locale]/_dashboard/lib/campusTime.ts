// The university is in Saudi Arabia (UTC+3, no daylight saving). The API stores UTC; the
// dashboards show and accept campus time, the same convention the attendee API uses for its
// ?date= filter (backend/src/modules/attendee/params.js).

export const CAMPUS_TIME_ZONE = 'Asia/Riyadh';
const CAMPUS_UTC_OFFSET = '+03:00';
const CAMPUS_OFFSET_MS = 3 * 60 * 60 * 1000;

const INPUT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** ISO string from the API -> value for <input type="datetime-local">, in campus time. */
export function isoToCampusInput(iso: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  return new Date(time + CAMPUS_OFFSET_MS).toISOString().slice(0, 16);
}

/** <input type="datetime-local"> value, read as campus time -> ISO string, or null if invalid. */
export function campusInputToIso(value: string): string | null {
  if (!INPUT_RE.test(value)) return null;
  const date = new Date(`${value}:00${CAMPUS_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Options for next-intl's format.dateTime so every screen shows the same campus time. */
export const DATE_TIME_FORMAT = {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: CAMPUS_TIME_ZONE,
} as const;

export const DATE_FORMAT = { dateStyle: 'medium', timeZone: CAMPUS_TIME_ZONE } as const;
