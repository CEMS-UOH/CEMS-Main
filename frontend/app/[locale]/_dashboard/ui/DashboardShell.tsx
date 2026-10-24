'use client';

// Frame shared by the organizer and admin areas: checks the session, checks the role, then
// renders the header, the area navigation and the page.
//
// The session lives in an httpOnly cookie on the API's origin, so it cannot be read here -
// we ask the API who we are (same approach as the /me page). This guard is a convenience for
// the user only: the API enforces requireAuth + requireRole on every route regardless.
import { createContext, useContext, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import AppHeader from '@/components/AppHeader';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import NotificationBell from '@/components/NotificationBell';
import { FRAME, FRAME_NARROW, TEXT_LINK } from '@/components/styles';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { getMe, logout, type PublicUser } from '@/lib/api';
import { HOME_BY_ROLE } from '@/lib/roleHome';
import { ErrorState, LoadingState } from './States';
import { useApiQuery } from '../lib/useApiQuery';

export type NavItem = {
  href: string;
  label: string;
  icon?: ReactNode;
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

const AREA_HOME: Record<Area, string> = { ORGANIZER: '/organizer', ADMIN: '/admin' };

/** Centred single card, for the moments before there is a dashboard to show. */
const GATE = `${FRAME_NARROW} flex min-h-screen flex-col justify-center gap-4 py-12`;

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
      <main className={GATE}>
        <LoadingState label={t('checkingSession')} />
      </main>
    );
  }

  if (session.errorCode || !session.data) {
    return (
      <main className={GATE}>
        <ErrorState code={session.errorCode ?? 'UNKNOWN'} onRetry={session.reload} />
        <Link href="/login" className={`mx-auto text-sm ${TEXT_LINK}`}>
          {t('goToLogin')}
        </Link>
      </main>
    );
  }

  const { user } = session.data;

  if (user.role !== area) {
    return (
      <main className={GATE}>
        <Card className="flex flex-col gap-2 text-start">
          <h1 className="type-h2 text-text">{t('noAccessTitle')}</h1>
          <p className="text-sm text-text-muted">{t(`noAccess.${area}`)}</p>
          <div className="pt-3">
            <Button href={HOME_BY_ROLE[user.role]} variant="secondary">
              {t(`goHome.${user.role}`)}
            </Button>
          </div>
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
        <AppHeader
          productName={t('productName')}
          homeHref={AREA_HOME[area]}
          badge={<Badge tone="primary">{tRoles(area)}</Badge>}
          navLabel={t(`navLabel.${area}`)}
          mainId="dashboard-main"
          skipLabel={t('skipToContent')}
          nav={nav.map((item) => ({
            href: item.href,
            label: item.label,
            icon: item.icon,
            active: item.isActive
              ? item.isActive(pathname)
              : pathname === item.href || pathname.startsWith(`${item.href}/`),
          }))}
          tools={
            <>
              <span className="hidden max-w-48 truncate text-sm text-text-muted lg:inline">
                {user.fullName}
              </span>
              <LocaleSwitcher />
              <NotificationBell />
              <Button variant="secondary" size="sm" onClick={onLogout} loading={loggingOut}>
                {loggingOut ? t('loggingOut') : t('logout')}
              </Button>
            </>
          }
        />

        <main id="dashboard-main" className={`${FRAME} flex flex-1 flex-col gap-8 pt-8 pb-16 sm:pt-10`}>
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}
