'use client';

import { use, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import { getOrganizerEvent, listEventAttendees } from '../../../../lib/organizer-api';
import type { Role5AttendeeRow } from '../../../../../(admin)/lib/role5-contracts';

export default function AttendeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<Role5AttendeeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [eventResult, attendeeResult] = await Promise.all([
        getOrganizerEvent(id),
        listEventAttendees(id),
      ]);
      if (!active) return;
      if (!eventResult.ok) {
        setError(eventResult.code);
        setLoading(false);
        return;
      }
      if (!attendeeResult.ok) {
        setError(attendeeResult.code);
        setLoading(false);
        return;
      }
      setTitle(eventResult.data.event.title);
      setRows(attendeeResult.data.attendees);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

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
      <h1 className="text-start text-2xl font-bold">{t('attendees.title', { title })}</h1>
      <Link href="/organizer" className="w-fit text-blue-700 underline">
        {t('common.back')}
      </Link>
      {rows.length === 0 ? (
        <p className="text-start text-slate-600">{t('common.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b bg-white">
                <th className="px-3 py-2 font-medium">{t('attendees.name')}</th>
                <th className="px-3 py-2 font-medium">{t('attendees.email')}</th>
                <th className="px-3 py-2 font-medium">{t('attendees.status')}</th>
                <th className="px-3 py-2 font-medium">{t('attendees.checkedIn')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.registrationId} className="border-b bg-white">
                  <td className="px-3 py-2">{row.fullName}</td>
                  <td className="px-3 py-2">{row.email}</td>
                  <td className="px-3 py-2">{t(`registration.${row.status}`)}</td>
                  <td className="px-3 py-2">
                    {row.checkedInAt ? new Date(row.checkedInAt).toLocaleString() : t('attendees.notCheckedIn')}
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
