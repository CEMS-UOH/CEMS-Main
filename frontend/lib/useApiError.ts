'use client';

import { useTranslations } from 'next-intl';

// Error codes the API can return (backend/src/lib/response.js callers).
// Each one has a key in messages/ar.json and messages/en.json under "Errors".
const TRANSLATED_CODES = [
  'INVALID_EMAIL',
  'WEAK_PASSWORD',
  'INVALID_NAME',
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'ACCOUNT_INACTIVE',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NETWORK',
  'UNKNOWN',
] as const;

type TranslatedCode = (typeof TRANSLATED_CODES)[number];

const isTranslated = (code: string): code is TranslatedCode =>
  (TRANSLATED_CODES as readonly string[]).includes(code);

/**
 * Turns an API error code into a localized message.
 * Unknown codes fall back to the generic "UNKNOWN" text rather than showing the
 * server's English string, so the UI never leaks untranslated copy (CLAUDE.md rule 7).
 */
export function useApiError() {
  const t = useTranslations('Errors');
  return (code: string) => (isTranslated(code) ? t(code) : t('UNKNOWN'));
}
