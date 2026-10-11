'use client';

import { useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import type { Role5Notification } from '../lib/role5-contracts';

type Props = {
  notifications: Role5Notification[];
  loading: boolean;
  error: string | null;
  onMarkRead: (id: string) => void;
  pendingId?: string | null;
};

export default function NotificationCenter({
  notifications,
  loading,
  error,
  onMarkRead,
  pendingId,
}: Props) {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();

  if (loading) return <p className="text-start text-slate-600">{t('common.loading')}</p>;
  if (error) {
    return (
      <FormMessage kind="error">
        {error === 'NOT_FOUND' ? t('errors.NOT_FOUND') : errorMessage(error)}
      </FormMessage>
    );
  }
  if (notifications.length === 0) {
    return <p className="text-start text-slate-600">{t('common.empty')}</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {notifications.map((item) => (
        <li
          key={item.id}
          className={`rounded border px-4 py-3 text-start ${item.isRead ? 'border-slate-200 bg-white' : 'border-slate-400 bg-slate-100'}`}
        >
          <p className="text-xs uppercase text-slate-500">{t(`notificationType.${item.type}`)}</p>
          <p className="font-medium">{item.title}</p>
          <p className="text-sm text-slate-700">{item.body}</p>
          <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
          {item.isRead ? (
            <p className="mt-2 text-xs text-slate-500">{t('notifications.read')}</p>
          ) : (
            <button
              type="button"
              disabled={pendingId === item.id}
              onClick={() => onMarkRead(item.id)}
              className="mt-2 rounded bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-60"
            >
              {t('notifications.markRead')}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
