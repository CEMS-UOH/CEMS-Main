import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Plus_Jakarta_Sans, Tajawal } from 'next/font/google';
import { routing } from '@/i18n/routing';
import '../globals.css';

// Arabic UI text uses Tajawal (matches the University of Hail portal), English UI
// text uses Plus Jakarta Sans. globals.css switches between them off html[dir].
const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

// The browser tab shows the product name in the visitor's language. The favicon is
// app/icon.svg, picked up by Next.js on its own.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale,
    namespace: 'Home',
  });
  return { title: t('title'), description: t('metaDescription') };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // RTL for Arabic, LTR for English. Use logical Tailwind classes (ms-, me-, ps-, pe-, text-start)
  // instead of left/right so every screen flips correctly.
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className={`${tajawal.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-background text-text">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
