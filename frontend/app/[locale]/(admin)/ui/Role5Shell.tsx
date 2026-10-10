'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import FormMessage from '@/components/FormMessage';
import { getMe, logout, type PublicUser } from '@/lib/api';
import { useApiError } from '@/lib/useApiError';
import { ROLE5_USE_MOCKS } from '../lib/role5-contracts';

type Role = 'ORGANIZER' | 'ADMIN';

type Props = {
  allowedRole: Role;
  children: React.ReactNode;
};

export default function Role5Shell({ allowedRole, children }: Props) {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      if (ROLE5_USE_MOCKS) {
        setUser({
          id: allowedRole === 'ADMIN' ? 'usr-admin-1' : 'org-1',
          email: allowedRole === 'ADMIN' ? 'admin@example.com' : 'organizer@example.com',
          fullName: allowedRole === 'ADMIN' ? 'Campus Admin' : 'Event Organizer',
          role: allowedRole,
          isActive: true,
          createdAt: '2026-01-01T00:00:00.000Z',
        });
        setLoading(false);
        return;
      }
      if (result.status === 401 || result.status === 403) {
        router.replace('/login');
        return;
      }
      setError(result.code);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [allowedRole, router]);

  const links = useMemo(() => {
    if (allowedRole === 'ADMIN') {
      return [
        { href: '/admin', label: t('nav.dashboard') },
        { href: '/admin/users', label: t('nav.users') },
        { href: '/admin/events', label: t('nav.approvals') },
        { href: '/admin/analytics', label: t('nav.analytics') },
        { href: '/admin/notifications', label: t('nav.notifications') },
      ];
    }
    return [
      { href: '/organizer', label: t('nav.events') },
      { href: '/organizer/events/new', label: t('nav.newEvent') },
      { href: '/organizer/notifications', label: t('nav.notifications') },
    ];
  }, [allowedRole, t]);

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-start text-slate-600">{t('common.loading')}</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
        <FormMessage kind="error">{errorMessage(error)}</FormMessage>
      </main>
    );
  }

  if (user && user.role !== allowedRole) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
        <FormMessage kind="error">{errorMessage('FORBIDDEN')}</FormMessage>
        <Link href="/me" className="text-start text-blue-700 underline">
          {t('nav.account')}
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-start font-semibold">{t('brand')}</p>
          <nav className="flex flex-wrap gap-3 text-start text-sm">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? 'font-semibold text-slate-900' : 'text-blue-700 underline'}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/me" className="text-blue-700 underline">
              {t('nav.account')}
            </Link>
            <button type="button" onClick={onLogout} className="text-start text-blue-700 underline">
              {t('common.logout')}
            </button>
            <LocaleSwitcher />
          </nav>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        {ROLE5_USE_MOCKS ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-start text-sm text-amber-900">
            {t('common.mockBanner')}
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
