'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import { deleteOrganizerEvent, listOrganizerEvents } from '../lib/organizer-api';
import type { Role5Event } from '../../(admin)/lib/role5-contracts';

export default function OrganizerEventsPage() {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const [events, setEvents] = useState<Role5Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function load() {
    const result = await listOrganizerEvents();
    if (!result.ok) {
      setError(result.code);
      setLoading(false);
      return;
    }
    setEvents(result.data.events);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onDelete(id: string) {
    setPendingId(id);
    const result = await deleteOrganizerEvent(id);
    setPendingId(null);
    setConfirmId(null);
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
        {error === 'NOT_FOUND' ? t('errors.NOT_FOUND') : errorMessage(error)}
      </FormMessage>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-start text-2xl font-bold">{t('organizer.title')}</h1>
        <Link href="/organizer/events/new" className="rounded bg-slate-900 px-4 py-2 text-white">
          {t('nav.newEvent')}
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="text-start text-slate-600">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b bg-white">
                <th className="px-3 py-2 font-medium">{t('event.title')}</th>
                <th className="px-3 py-2 font-medium">{t('event.status')}</th>
                <th className="px-3 py-2 font-medium">{t('event.startsAt')}</th>
                <th className="px-3 py-2 font-medium">{t('event.registered')}</th>
                <th className="px-3 py-2 font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b bg-white">
                  <td className="px-3 py-2">{event.title}</td>
                  <td className="px-3 py-2">{t(`status.${event.status}`)}</td>
                  <td className="px-3 py-2">{new Date(event.startsAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{event.registeredCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/organizer/events/${event.id}/edit`} className="text-blue-700 underline">
                        {t('common.edit')}
                      </Link>
                      <Link
                        href={`/organizer/events/${event.id}/attendees`}
                        className="text-blue-700 underline"
                      >
                        {t('nav.attendees')}
                      </Link>
                      {confirmId === event.id ? (
                        <>
                          <button
                            type="button"
                            disabled={pendingId === event.id}
                            onClick={() => onDelete(event.id)}
                            className="text-red-700 underline"
                          >
                            {t('common.confirmDelete')}
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className="underline">
                            {t('common.cancel')}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmId(event.id)} className="text-red-700 underline">
                          {t('common.delete')}
                        </button>
                      )}
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
