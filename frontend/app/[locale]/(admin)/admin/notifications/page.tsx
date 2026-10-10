'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import NotificationCenter from '../../ui/NotificationCenter';
import { listNotifications, markNotificationRead } from '../../lib/admin-api';
import type { Role5Notification } from '../../lib/role5-contracts';

export default function AdminNotificationsPage() {
  const t = useTranslations('Role5');
  const [items, setItems] = useState<Role5Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listNotifications();
    if (!result.ok) {
      setError(result.code);
      setLoading(false);
      return;
    }
    setItems(result.data.notifications);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onMarkRead(id: string) {
    setPendingId(id);
    const result = await markNotificationRead(id);
    setPendingId(null);
    if (!result.ok) {
      setError(result.code);
      return;
    }
    setItems((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-start text-2xl font-bold">{t('notifications.title')}</h1>
      <NotificationCenter
        notifications={items}
        loading={loading}
        error={error}
        onMarkRead={onMarkRead}
        pendingId={pendingId}
      />
    </section>
  );
}
