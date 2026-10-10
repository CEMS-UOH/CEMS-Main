'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import { getAdminDashboard } from '../lib/admin-api';
import type { Role5AdminDashboard } from '../lib/role5-contracts';

export default function AdminDashboardPage() {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const [data, setData] = useState<Role5AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await getAdminDashboard();
      if (!active) return;
      if (!result.ok) {
        setError(result.code);
        setLoading(false);
        return;
      }
      setData(result.data.dashboard);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-start text-slate-600">{t('common.loading')}</p>;
  if (error) return <FormMessage kind="error">{errorMessage(error)}</FormMessage>;
  if (!data) return null;

  const cards = [
    { href: '/admin/users', label: t('admin.usersTotal'), value: data.usersTotal },
    { href: '/admin/users', label: t('admin.usersActive'), value: data.usersActive },
    { href: '/admin/events', label: t('admin.eventsPending'), value: data.eventsPending },
    { href: '/admin/events', label: t('admin.eventsApproved'), value: data.eventsApproved },
    { href: '/admin/notifications', label: t('admin.notificationsUnread'), value: data.notificationsUnread },
  ];

  return (
    <section className="flex flex-col gap-6">
      <h1 className="text-start text-2xl font-bold">{t('admin.dashboardTitle')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded border border-slate-200 bg-white p-4 text-start shadow-sm"
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="text-3xl font-semibold">{card.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
