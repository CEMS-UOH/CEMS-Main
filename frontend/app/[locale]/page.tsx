import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import ApiStatus from '@/components/ApiStatus';
import LocaleSwitcher from '@/components/LocaleSwitcher';

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Home');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-slate-600">{t('subtitle')}</p>
      <ApiStatus />
      <LocaleSwitcher />
    </main>
  );
}
