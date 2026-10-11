'use client';

import { use } from 'react';
import { useTranslations } from 'next-intl';
import EventForm from '../../../../ui/EventForm';

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('Role5');
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-start text-2xl font-bold">{t('organizer.editTitle')}</h1>
      <EventForm eventId={id} />
    </section>
  );
}
