'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import Button from './Button';
import { GlobeIcon } from './Icons';

/**
 * Switches the page to the other language. A small ghost Button, so it is the same height and
 * sits on the same line as the account and log out buttons beside it in every header.
 */
export default function LocaleSwitcher() {
  const t = useTranslations('Home');
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'ar' ? 'en' : 'ar';

  return (
    // The label is the other language's own name, so it is announced in that language. On a
    // phone only the globe shows (the name is still read out), which leaves the header's
    // width to the product name.
    <Button href={pathname} locale={other} lang={other} variant="ghost" size="sm" icon={<GlobeIcon />}>
      <span className="max-sm:sr-only">{t('switchLanguage')}</span>
    </Button>
  );
}
