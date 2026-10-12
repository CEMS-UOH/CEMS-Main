// Home: what the system is, who it is for, and the way in. Public - no session needed.
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import Badge from '@/components/Badge';
import Brand from '@/components/Brand';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { CalendarIcon, ForwardIcon, GridIcon, SearchIcon, TicketIcon } from '@/components/Icons';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import HeaderBar from '@/components/HeaderBar';
import { FRAME_WIDE, TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
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
      <header className="border-b border-border bg-surface">
        <HeaderBar
          frame={FRAME_WIDE}
          start={<Brand name={t('title')} href="/" />}
          tools={
            <>
              <LocaleSwitcher />
              <HomeAccount />
            </>
          }
        />
      </header>

      {/*
        Hero. The picture is the team's own file, public/hero.jpg, used exactly as supplied
        (`unoptimized` serves that file itself, not a re-encoded copy). The headline and text
        are real HTML laid over it, never part of the image.

        The picture keeps its open space on the left, so:
        - in English the text sits on the left, over that space;
        - in Arabic the picture is mirrored with CSS, which moves the open space to the right,
          under the Arabic text. The file itself is not changed.

        Phones and tablets: the picture is anchored to the bottom and drawn 2.5x the screen
        width, so only its open side shows - the two groups of people stand below the text.

        Desktop: the picture fills the whole hero, edge to edge, and everything is sized from
        the screen's width so it stays in proportion from 1280 to 1920 and beyond:
        - the text starts 5% in from the edge and is as wide as the picture's open space
          (which is its first third), so there is no empty band beside it;
        - the headline grows with the screen (see type-display);
        - a spacer as tall as the people at the bottom keeps the text block above them, and
          the text is centred in the space that is left.
      */}
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden border-b border-border bg-surface"
      >
        <div
          aria-hidden
          className="absolute start-0 bottom-0 -z-20 aspect-[2000/1116] w-[250%] lg:inset-0 lg:aspect-auto lg:w-auto"
        >
          <Image
            src="/hero.jpg"
            alt=""
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover object-[0%_100%] rtl:-scale-x-100"
          />
          {/* Phones and tablets: the picture's top edge melts into the white above it instead
              of ending in a visible line. */}
          <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-surface to-transparent lg:hidden" />
        </div>
        {/* Desktop only: a soft white veil beside the text, fading out sideways over the scene
            so the end of a long line never sits on the buildings. It also fades out downwards
            (the mask), well above the people standing at the bottom, so it never covers them. */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 hidden from-surface from-30% to-transparent to-48% [mask-image:linear-gradient(to_bottom,black_50%,transparent_64%)] lg:block ltr:bg-linear-to-r rtl:bg-linear-to-l"
        />

        <div className={`${FRAME_WIDE} flex min-h-[46rem] flex-col lg:min-h-[max(50rem,56vw)]`}>
          <div className="flex max-w-xl flex-col items-start gap-6 pt-12 text-start sm:pt-16 lg:max-w-[31vw] lg:flex-1 lg:justify-center lg:py-10">
            <div className={RISE[0]}>
              {/* The one gold element on this screen. */}
              <Badge tone="accent">{t('university')}</Badge>
            </div>
            <h1 id="hero-title" className={`type-display text-primary-dark ${RISE[1]}`}>
              {t('headline')}
            </h1>
            <p
              className={`text-lg text-text-muted lg:max-w-[26vw] lg:text-[clamp(1.125rem,1.3vw,1.5rem)] ${RISE[2]}`}
            >
              {t('lead')}
            </p>
            <div className={`flex flex-wrap items-center gap-3 pt-2 ${RISE[3]}`}>
              <Button href="/events" size="lg" icon={<CalendarIcon className="size-5" />}>
                {t('browse')}
              </Button>
              <Button href="/register" variant="secondary" size="lg">
                {t('register')}
              </Button>
            </div>
          </div>
          {/* Desktop: as tall as the people at the foot of the picture, so text never covers them. */}
          <div aria-hidden className="hidden h-[max(16rem,17.5vw)] shrink-0 lg:block" />
        </div>
      </section>

      <main className={`${FRAME_WIDE} flex flex-1 flex-col gap-16 py-16 sm:gap-20 sm:py-20`}>
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
                  {/* The way in for someone who wants to run an event: registration opens
                      with "Organizer" already chosen. */}
                  {key === 'organize' ? (
                    <Link
                      href="/register?type=organizer"
                      className={`mt-auto flex w-fit items-center gap-1.5 pt-1 text-sm ${TEXT_LINK}`}
                    >
                      {t('features.organize.cta')}
                      <ForwardIcon />
                    </Link>
                  ) : null}
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
          className={`${FRAME_WIDE} flex flex-col gap-3 py-6 text-start text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="font-medium text-text">{t('university')}</p>
          {/* The same small ghost buttons as the header, so the three sit evenly. */}
          <nav aria-label={t('footerNav')} className="-mx-3 flex flex-wrap items-center gap-2">
            <Button href="/events" variant="ghost" size="sm">
              {t('browse')}
            </Button>
            <Button href="/login" variant="ghost" size="sm">
              {t('login')}
            </Button>
            <LocaleSwitcher />
          </nav>
        </div>
      </footer>
    </div>
  );
}
