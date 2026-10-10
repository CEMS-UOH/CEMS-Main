'use client';

import { useTranslations } from 'next-intl';
import EventForm from '../../../ui/EventForm';

export default function NewEventPage() {
  const t = useTranslations('Role5');
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-start text-2xl font-bold">{t('organizer.createTitle')}</h1>
      <EventForm />
    </section>
  );
}
