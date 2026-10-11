'use client';

// Frame for the attendee area: header with the area navigation, then the page. Browsing is
// public (FR-03, FR-09), so this never blocks on the session - it only adapts the account link.
import { useTranslations } from 'next-intl';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { Link, usePathname } from '@/i18n/navigation';
import { SessionProvider, useSession } from '../_lib/session';
import { FOCUS_RING, FRAME } from '../_lib/styles';
import { CalendarIcon, TicketIcon, UserIcon } from './Icons';

export default function AttendeeShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen flex-col">
        <Header />
        <main id="attendee-main" className={`${FRAME} flex-1 pt-6 pb-16 sm:pt-8`}>
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}

function Header() {
  const t = useTranslations('AttendeeNav');
  const pathname = usePathname();
  const { session, user } = useSession();

  const nav = [
    { href: '/events', label: t('events'), icon: <CalendarIcon />, active: pathname.startsWith('/events') },
    { href: '/bookings', label: t('bookings'), icon: <TicketIcon />, active: pathname.startsWith('/bookings') },
  ];

  return (
    <header className="border-b border-border bg-surface">
      <a
        href="#attendee-main"
        className={`sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-20 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow-[var(--shadow-card)] ${FOCUS_RING}`}
      >
        {t('skipToContent')}
      </a>

      <div className={`${FRAME} flex items-center justify-between gap-4 py-3`}>
        <Link href="/events" className={`flex min-w-0 items-center gap-2.5 rounded-lg ${FOCUS_RING}`}>
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-[var(--shadow-card)]"
          >
            <CalendarIcon className="size-5" />
          </span>
          <span className="truncate text-sm font-bold text-primary-dark sm:text-base">
            {t('productName')}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          {session.status === 'loading' ? (
            <span className="h-9 w-24 animate-pulse rounded-lg bg-background" aria-hidden />
          ) : user ? (
            <Link
              href="/me"
              className={`flex max-w-44 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-text hover:bg-background ${FOCUS_RING}`}
            >
              <UserIcon className="size-4 shrink-0 text-primary" />
              <span className="truncate">{user.fullName}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className={`rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-card)] hover:bg-primary-dark ${FOCUS_RING}`}
            >
              {t('login')}
            </Link>
          )}
        </div>
      </div>

      <nav aria-label={t('label')} className={`${FRAME} flex items-center gap-1 overflow-x-auto`}>
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${FOCUS_RING} ${
              item.active
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        <div className="ms-auto shrink-0 py-2 sm:hidden">
          <LocaleSwitcher />
        </div>
      </nav>
    </header>
  );
}
