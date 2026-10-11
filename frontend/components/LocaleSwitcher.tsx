'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { TEXT_LINK } from './styles';

export default function LocaleSwitcher() {
  const t = useTranslations('Home');
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'ar' ? 'en' : 'ar';

  return (
    // The label is the other language's own name, so it is announced in that language.
    <Link href={pathname} locale={other} lang={other} className={`w-fit shrink-0 text-sm ${TEXT_LINK}`}>
      {t('switchLanguage')}
    </Link>
  );
}
