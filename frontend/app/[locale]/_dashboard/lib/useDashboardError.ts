'use client';

import { useTranslations } from 'next-intl';
import { useApiError } from '@/lib/useApiError';

// Error codes specific to the organizer and admin APIs (see their API.md files). Each has a
// key under "Errors" in messages/ar.json and messages/en.json. Codes shared with the rest of
// the app (NETWORK, FORBIDDEN, EMAIL_TAKEN, ...) are delegated to the shared useApiError,
// which also supplies the translated generic fallback for anything unknown.
const DASHBOARD_CODES = [
  'INVALID_TITLE',
  'INVALID_DESCRIPTION',
  'INVALID_DATES',
  'INVALID_CAPACITY',
  'INVALID_CATEGORY',
  'INVALID_VENUE',
  'INVALID_IMAGE_URL',
  'INVALID_ATTACHMENTS',
  'INVALID_BODY',
  'INVALID_ROLE',
  'INVALID_FILTER',
  'INVALID_PAGINATION',
  'CAPACITY_EXCEEDS_VENUE',
  'CAPACITY_BELOW_BOOKED',
  'EVENT_NOT_FOUND',
  'EVENT_NOT_EDITABLE',
  'EVENT_ALREADY_STARTED',
  'EVENT_HAS_BOOKINGS',
  'PENDING_LIMIT_REACHED',
  'EVENT_NOT_PENDING',
  'USER_NOT_FOUND',
  'CANNOT_MODIFY_SELF',
  'LAST_ADMIN_PROTECTED',
  'USER_HAS_DATA',
  'CATEGORY_NOT_FOUND',
  'CATEGORY_NAME_TAKEN',
  'CATEGORY_HAS_EVENTS',
  'NOTIFICATION_NOT_FOUND',
] as const;

const isDashboardCode = (code: string) => (DASHBOARD_CODES as readonly string[]).includes(code);

/** Turns an API error code into a localized message - never the server's English text. */
export function useDashboardError() {
  const t = useTranslations('Errors');
  const shared = useApiError();
  return (code: string) => (isDashboardCode(code) ? t(code) : shared(code));
}
