'use client';

// Frame shared by the organizer and admin areas: checks the session, checks the role, then
// renders the header, the area navigation and the page.
//
// The session lives in an httpOnly cookie on the API's origin, so it cannot be read here -
// we ask the API who we are (same approach as the /me page). This guard is a convenience for
// the user only: the API enforces requireAuth + requireRole on every route regardless.
import { createContext, useContext, useState } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { getMe, logout, type PublicUser } from '@/lib/api';
import Button from './Button';
import { FOCUS_RING, TEXT_LINK } from './focus';
import { ErrorState, LoadingState } from './States';
import { useApiQuery } from '../lib/useApiQuery';

export type NavItem = {
  href: string;
  label: string;
  /** Defaults to "this path or anything under it". */
  isActive?: (pathname: string) => boolean;
};

type Area = 'ORGANIZER' | 'ADMIN';

type Props = {
  area: Area;
  nav: NavItem[];
  children: React.ReactNode;
};

const UserContext = createContext<PublicUser | null>(null);

/** The signed-in user. Only valid below <DashboardShell>, which renders pages only once it is known. */
export function useDashboardUser(): PublicUser {
  const user = useContext(UserContext);
  if (!user) throw new Error('useDashboardUser must be used inside <DashboardShell>');
  return user;
}

const HOME_BY_ROLE: Record<PublicUser['role'], string> = {
  ADMIN: '/admin',
  ORGANIZER: '/organizer',
  ATTENDEE: '/me',
};

const FRAME = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

export default function DashboardShell({ area, nav, children }: Props) {
  const t = useTranslations('Dashboard');
  const tRoles = useTranslations('Roles');
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  // 401 is handled inside useApiQuery (redirect to /login).
  const session = useApiQuery('session', getMe);

  if (session.loading) {
    return (
      <main className={`${FRAME} py-8`}>
        <LoadingState label={t('checkingSession')} />
      </main>
    );
  }

  if (session.errorCode || !session.data) {
    return (
      <main className={`${FRAME} flex flex-col gap-4 py-8`}>
        <ErrorState code={session.errorCode ?? 'UNKNOWN'} onRetry={session.reload} />
        <Link href="/login" className={`w-fit text-sm ${TEXT_LINK}`}>
          {t('goToLogin')}
        </Link>
      </main>
    );
  }

  const { user } = session.data;

  if (user.role !== area) {
    return (
      <main className={`${FRAME} py-8`}>
        <Card className="flex flex-col gap-2 text-start">
          <h1 className="text-xl font-bold text-text">{t('noAccessTitle')}</h1>
          <p className="text-sm text-text-muted">{t(`noAccess.${area}`)}</p>
          <Link href={HOME_BY_ROLE[user.role]} className={`mt-2 w-fit text-sm ${TEXT_LINK}`}>
            {t(`goHome.${user.role}`)}
          </Link>
        </Card>
      </main>
    );
  }

  async function onLogout() {
    setLoggingOut(true);
    await logout();
    router.replace('/login');
  }

  return (
    <UserContext.Provider value={user}>
      <div className="flex min-h-screen flex-col">
        <a
          href="#dashboard-main"
          className={`sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-10 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow-[var(--shadow-card)] ${FOCUS_RING}`}
        >
          {t('skipToContent')}
        </a>

        <header className="border-b border-border bg-surface">
          <div className={`${FRAME} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3`}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="truncate text-base font-bold text-primary-dark">
                {t('productName')}
              </span>
              <span className="shrink-0 rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary-dark">
                {tRoles(area)}
              </span>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden max-w-48 truncate text-sm text-text-muted sm:inline">
                {user.fullName}
              </span>
              <LocaleSwitcher />
              <Button variant="secondary" size="sm" onClick={onLogout} disabled={loggingOut}>
                {loggingOut ? t('loggingOut') : t('logout')}
              </Button>
            </div>
          </div>

          <nav aria-label={t(`navLabel.${area}`)} className={FRAME}>
            {/* Scrolls sideways inside itself on narrow screens - the page never does. The
                padding leaves room for the focus ring, which overflow would otherwise clip. */}
            <ul className="-mx-1 flex gap-1 overflow-x-auto p-1 pb-3">
              {nav.map((item) => {
                const active = item.isActive
                  ? item.isActive(pathname)
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={`inline-flex items-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${FOCUS_RING} ${
                        active
                          ? 'bg-primary-light text-primary-dark'
                          : 'text-text-muted hover:bg-primary-light hover:text-primary-dark'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </header>

        <main id="dashboard-main" className={`${FRAME} flex flex-1 flex-col gap-6 py-6 sm:py-8`}>
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}
