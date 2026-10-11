'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import { listReviewEvents, reviewEvent } from '../../lib/admin-api';
import type { Role5Event } from '../../lib/role5-contracts';

export default function AdminApprovalsPage() {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const [events, setEvents] = useState<Role5Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await listReviewEvents('PENDING');
      if (!active) return;
      if (!result.ok) {
        setError(result.code);
        setLoading(false);
        return;
      }
      setEvents(result.data.events);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onReview(id: string, status: 'APPROVED' | 'REJECTED') {
    setPendingId(id);
    const result = await reviewEvent(id, status);
    setPendingId(null);
    if (!result.ok) {
      setError(result.code);
      return;
    }
    setEvents((current) => current.filter((event) => event.id !== id));
  }

  if (loading) return <p className="text-start text-slate-600">{t('common.loading')}</p>;
  if (error) {
    return (
      <FormMessage kind="error">
        {error === 'NOT_FOUND' || error === 'INVALID_STATUS' ? t(`errors.${error}`) : errorMessage(error)}
      </FormMessage>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-start text-2xl font-bold">{t('admin.approvalsTitle')}</h1>
      {events.length === 0 ? (
        <p className="text-start text-slate-600">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b bg-white">
                <th className="px-3 py-2 font-medium">{t('event.title')}</th>
                <th className="px-3 py-2 font-medium">{t('event.category')}</th>
                <th className="px-3 py-2 font-medium">{t('event.startsAt')}</th>
                <th className="px-3 py-2 font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b bg-white">
                  <td className="px-3 py-2">{event.title}</td>
                  <td className="px-3 py-2">{event.category.name}</td>
                  <td className="px-3 py-2">{new Date(event.startsAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={pendingId === event.id}
                        onClick={() => onReview(event.id, 'APPROVED')}
                        className="text-green-800 underline disabled:opacity-60"
                      >
                        {t('admin.approve')}
                      </button>
                      <button
                        type="button"
                        disabled={pendingId === event.id}
                        onClick={() => onReview(event.id, 'REJECTED')}
                        className="text-red-700 underline disabled:opacity-60"
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
