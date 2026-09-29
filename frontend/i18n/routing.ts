import { defineRouting } from 'next-intl/routing';

// Arabic (RTL) is the default language, English (LTR) is the second one.
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
});
