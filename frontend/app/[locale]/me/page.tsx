'use client';

// Protected page. The session lives in an httpOnly cookie on the API's origin, so it
// cannot be read here - we ask the API who we are and redirect to /login on 401.
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import FormMessage from '@/components/FormMessage';
import { getMe, logout, type PublicUser } from '@/lib/api';
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
      <main className="mx-auto max-w-md px-6 py-12">
        <p className="text-start text-slate-600">{t('loading')}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-12">
        <FormMessage kind="error">{error}</FormMessage>
        <Link href="/login" className="text-start text-blue-700 underline">
          {t('logout')}
        </Link>
      </main>
    );
  }

  if (!user) return null; // redirect already in flight

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-6 py-12">
      <h1 className="text-start text-2xl font-bold">{t('title')}</h1>

      <dl className="flex flex-col gap-3 text-start">
        <div>
          <dt className="text-xs uppercase text-slate-500">{t('fullName')}</dt>
          <dd className="text-base">{user.fullName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">{t('email')}</dt>
          <dd className="text-base">{user.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">{t('role')}</dt>
          <dd className="text-base">{tRoles(user.role)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {loggingOut ? t('loggingOut') : t('logout')}
        </button>
        <Link href="/" className="text-start text-blue-700 underline">
          {t('backHome')}
        </Link>
      </div>
    </main>
  );
}
