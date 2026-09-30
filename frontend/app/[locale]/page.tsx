import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import ApiStatus from '@/components/ApiStatus';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { Link } from '@/i18n/navigation';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Home');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold text-start">{t('title')}</h1>
      <p className="text-slate-600 text-start">{t('subtitle')}</p>
      <ApiStatus />

      <nav className="flex flex-wrap gap-4 text-start">
        <Link href="/login" className="text-blue-700 underline">
          {t('login')}
        </Link>
        <Link href="/register" className="text-blue-700 underline">
          {t('register')}
        </Link>
        <Link href="/me" className="text-blue-700 underline">
          {t('myAccount')}
        </Link>
      </nav>

      <LocaleSwitcher />
    </main>
  );
}
