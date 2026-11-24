'use client';

// Frame for the attendee area: header with the area navigation, then the page. Browsing is
// public (FR-03, FR-09), so this never blocks on the session - it only adapts the account link.
import { useTranslations } from 'next-intl';
import AppHeader from '@/components/AppHeader';
import Button from '@/components/Button';
import { CalendarIcon, ChartIcon, HeartIcon, TicketIcon, UserIcon } from '@/components/Icons';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import NotificationBell from '@/components/NotificationBell';
import ChatAssistant from '@/components/ChatAssistant';
import { FRAME } from '@/components/styles';
import { usePathname } from '@/i18n/navigation';
import { SavedProvider } from '../_lib/saved';
import { SessionProvider, useSession } from '../_lib/session';

export default function AttendeeShell({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SavedProvider>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="attendee-main" className={`${FRAME} flex-1 pt-8 pb-16 sm:pt-10`}>
            {children}
          </main>
        </div>
      </SavedProvider>
    </SessionProvider>
  );
}

function Header() {
  const t = useTranslations('AttendeeNav');
  const pathname = usePathname();
  const { session, user } = useSession();

  return (
    <AppHeader
      productName={t('productName')}
      homeHref="/"
      navLabel={t('label')}
      mainId="attendee-main"
      skipLabel={t('skipToContent')}
      nav={[
        {
          href: '/events',
          label: t('events'),
          icon: <CalendarIcon />,
          active: pathname.startsWith('/events'),
        },
        {
          href: '/bookings',
          label: t('bookings'),
          icon: <TicketIcon />,
          active: pathname.startsWith('/bookings'),
        },
        // Only an Attendee saves events and has an activity record, so only they see these tabs.
        ...(user?.role === 'ATTENDEE'
          ? [
              {
                href: '/saved',
                label: t('saved'),
                icon: <HeartIcon className="size-4" />,
                active: pathname.startsWith('/saved'),
              },
              {
                href: '/activity',
                label: t('activity'),
                icon: <ChartIcon />,
                active: pathname.startsWith('/activity'),
              },
            ]
          : []),
      ]}
      tools={
        <>
          <ThemeSwitcher />
          <LocaleSwitcher />
          {session.status === 'loading' ? (
            <span className="h-9 w-24 animate-pulse rounded-lg bg-background" aria-hidden />
          ) : user ? (
            <>
              <ChatAssistant userId={user.id} />
              <NotificationBell />
              {/* On a phone the button is just the person icon (the name stays available to
                  screen readers), which leaves the header's width to the product name. */}
              <Button href="/me" variant="secondary" size="sm" icon={<UserIcon />} className="sm:max-w-48">
                <span className="truncate max-sm:sr-only">{user.fullName}</span>
              </Button>
            </>
          ) : (
            <Button href="/login" size="sm">
              {t('login')}
            </Button>
          )}
        </>
      }
    />
  );
}
