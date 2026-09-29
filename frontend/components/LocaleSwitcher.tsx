'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export default function LocaleSwitcher() {
  const t = useTranslations('Home');
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'ar' ? 'en' : 'ar';

  return (
    <Link href={pathname} locale={other} className="w-fit text-blue-700 underline">
      {t('switchLanguage')}
    </Link>
  );
}
