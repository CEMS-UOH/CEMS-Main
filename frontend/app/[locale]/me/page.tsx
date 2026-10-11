'use client';

// Protected page. The session lives in an httpOnly cookie on the API's origin, so it
// cannot be read here - we ask the API who we are and redirect to /login on 401.
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import AuthShell from '@/components/AuthShell';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { CalendarIcon, GridIcon, TicketIcon } from '@/components/Icons';
import { ErrorState, LoadingState } from '@/components/States';
import { TEXT_LINK } from '@/components/styles';
import { getMe, logout, type PublicUser } from '@/lib/api';
import { HOME_BY_ROLE } from '@/lib/roleHome';
import { useApiError } from '@/lib/useApiError';

export default function MePage() {
  const t = useTranslations('Me');
  const tRoles = useTranslations('Roles');
  const errorMessage = useApiError();
  const router = useRouter();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const result = await getMe();
      if (!active) return;

      if (result.ok) {
        setUser(result.data.user);
        setLoading(false);
        return;
      }

      // Not logged in (or the session expired / the account was disabled) -> log in again.
      if (result.status === 401 || result.status === 403) {
        router.replace('/login');
        return;
      }

      setError(errorMessage(result.code));
      setLoading(false);
    })();

    return () => {
      active = false;
    };
    // errorMessage is stable for a given locale; router is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    await logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <AuthShell>
        <LoadingState label={t('loading')} />
      </AuthShell>
    );
  }

  if (error) {
    return (
      <AuthShell>
        <ErrorState message={error} />
        <Link href="/login" className={`mx-auto text-sm ${TEXT_LINK}`}>
          {t('goToLogin')}
        </Link>
      </AuthShell>
    );
  }

  if (!user) return null; // redirect already in flight

  return (
    <AuthShell>
      <h1 className="type-h1 text-start text-text">{t('title')}</h1>

      <Card>
        <dl className="flex flex-col gap-4 text-start">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-text-muted">{t('fullName')}</dt>
            <dd className="text-base font-medium text-text [overflow-wrap:anywhere]">{user.fullName}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs font-medium text-text-muted">{t('email')}</dt>
            <dd dir="ltr" className="w-fit max-w-full text-base text-text [overflow-wrap:anywhere]">
              {user.email}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-text-muted">{t('role')}</dt>
            <dd>
              {/* The one gold element on this screen. */}
              <Badge tone="accent">{tRoles(user.role)}</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {/* Where this account's work actually happens. */}
      <div className="flex flex-col gap-3">
        {user.role === 'ATTENDEE' ? (
          <>
            <Button href="/events" icon={<CalendarIcon />} className="w-full">
              {t('browseEvents')}
            </Button>
            <Button href="/bookings" variant="secondary" icon={<TicketIcon />} className="w-full">
              {t('myBookings')}
            </Button>
          </>
        ) : (
          <Button href={HOME_BY_ROLE[user.role]} icon={<GridIcon />} className="w-full">
            {t('dashboard')}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onLogout} loading={loggingOut} className="w-full">
          {loggingOut ? t('loggingOut') : t('logout')}
        </Button>
      </div>
    </AuthShell>
  );
}
