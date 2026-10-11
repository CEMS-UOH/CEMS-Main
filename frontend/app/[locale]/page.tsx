// Home: what the system is, who it is for, and the way in. Public - no session needed.
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import Badge from '@/components/Badge';
import Brand from '@/components/Brand';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { CalendarIcon, GridIcon, SearchIcon, TicketIcon } from '@/components/Icons';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { FRAME, TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import HeroArt from './_home/HeroArt';
import HomeAccount from './_home/HomeAccount';
import UpcomingEvents from './_home/UpcomingEvents';

// Each step of the entrance starts a little after the one before it.
const RISE = ['animate-rise', 'animate-rise [animation-delay:80ms]', 'animate-rise [animation-delay:160ms]', 'animate-rise [animation-delay:240ms]'];

export default function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('Home');

  const features = [
    { key: 'discover', icon: <SearchIcon className="size-5" /> },
    { key: 'book', icon: <TicketIcon className="size-5" /> },
    { key: 'organize', icon: <GridIcon className="size-5" /> },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b border-border bg-surface">
        <header className={`${FRAME} flex items-center justify-between gap-3 py-4`}>
          <Brand name={t('title')} href="/" />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <LocaleSwitcher />
            <HomeAccount />
          </div>
        </header>

        <section
          aria-labelledby="hero-title"
          className={`${FRAME} grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16 lg:py-24`}
        >
          <div className="flex flex-col items-start gap-6 text-start">
            <div className={RISE[0]}>
              {/* The one gold element on this screen. */}
              <Badge tone="accent">{t('university')}</Badge>
            </div>
            <h1 id="hero-title" className={`type-display text-primary-dark ${RISE[1]}`}>
              {t('headline')}
            </h1>
            <p className={`max-w-xl text-lg text-text-muted ${RISE[2]}`}>{t('lead')}</p>
            <div className={`flex flex-wrap items-center gap-3 pt-2 ${RISE[3]}`}>
              <Button href="/events" size="lg" icon={<CalendarIcon className="size-5" />}>
                {t('browse')}
              </Button>
              <Button href="/register" variant="secondary" size="lg">
                {t('register')}
              </Button>
            </div>
          </div>

          <div className={`hidden lg:block ${RISE[2]}`}>
            <HeroArt />
          </div>
        </section>
      </div>

      <main className={`${FRAME} flex flex-1 flex-col gap-16 py-16 sm:gap-20 sm:py-20`}>
        <section aria-labelledby="features-title" className="flex flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2 text-start">
            <h2 id="features-title" className="type-h1 text-text">
              {t('features.title')}
            </h2>
            <p className="text-base text-text-muted">{t('features.subtitle')}</p>
          </div>
          <ul className="grid gap-5 md:grid-cols-3">
            {features.map(({ key, icon }) => (
              <li key={key} className="flex">
                <Card className="flex w-full flex-col gap-3 text-start">
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-lg bg-primary-light text-primary"
                  >
                    {icon}
                  </span>
                  <h3 className="type-h3 text-text">{t(`features.${key}.title`)}</h3>
                  <p className="text-sm text-text-muted">{t(`features.${key}.body`)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="upcoming-title" className="flex flex-col gap-8">
          <div className="flex max-w-2xl flex-col gap-2 text-start">
            <h2 id="upcoming-title" className="type-h1 text-text">
              {t('upcoming.title')}
            </h2>
            <p className="text-base text-text-muted">{t('upcoming.subtitle')}</p>
          </div>
          <UpcomingEvents />
        </section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div
          className={`${FRAME} flex flex-col gap-3 py-8 text-start text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>
            <span className="font-medium text-text">{t('title')}</span>
            <span className="mx-2" aria-hidden>
              ·
            </span>
            {t('subtitle')}
          </p>
          <nav aria-label={t('footerNav')} className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/events" className={TEXT_LINK}>
              {t('browse')}
            </Link>
            <Link href="/login" className={TEXT_LINK}>
              {t('login')}
            </Link>
            <LocaleSwitcher />
          </nav>
        </div>
      </footer>
    </div>
  );
}
