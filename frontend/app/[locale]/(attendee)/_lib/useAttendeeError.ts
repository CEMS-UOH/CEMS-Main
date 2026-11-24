'use client';

import { useTranslations } from 'next-intl';
import { useApiError } from '@/lib/useApiError';

// Error codes specific to the attendee API (backend/src/modules/attendee/API.md), including
// the feedback codes. Each has a key under "Errors"
// in messages/ar.json and messages/en.json. Shared codes (NETWORK, UNAUTHENTICATED, FORBIDDEN,
// ...) go to the shared useApiError, which also supplies the translated fallback for anything
// unknown - the UI never shows the server's English text.
const ATTENDEE_CODES = [
  'INVALID_FILTER',
  'INVALID_PAGINATION',
  'EVENT_NOT_FOUND',
  'ALREADY_BOOKED',
  'EVENT_FULL',
  'BOOKING_CLOSED',
  'BOOKING_NOT_FOUND',
  'ALREADY_CANCELLED',
  'CANCELLATION_CLOSED',
  'ALREADY_CHECKED_IN',
  'INVALID_RATING',
  'INVALID_COMMENT',
  'FEEDBACK_NOT_OPEN',
  'ALREADY_REVIEWED',
  'EVENT_NOT_FULL',
  'ALREADY_WAITLISTED',
  'NOT_ON_WAITLIST',
] as const;

const isAttendeeCode = (code: string) => (ATTENDEE_CODES as readonly string[]).includes(code);

/** Turns an API error code into a localized message. */
export function useAttendeeError() {
  const t = useTranslations('Errors');
  const shared = useApiError();
  return (code: string) => (isAttendeeCode(code) ? t(code) : shared(code));
}
