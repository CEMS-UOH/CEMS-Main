'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import FormMessage from '@/components/FormMessage';
import { useApiError } from '@/lib/useApiError';
import {
  createOrganizerEvent,
  getOrganizerEvent,
  listOrganizerCategories,
  listOrganizerVenues,
  updateOrganizerEvent,
} from '../lib/organizer-api';
import type { Role5Category, Role5EventInput, Role5Venue } from '../../(admin)/lib/role5-contracts';

type Props = { eventId?: string };

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(local: string): string {
  return new Date(local).toISOString();
}

export default function EventForm({ eventId }: Props) {
  const t = useTranslations('Role5');
  const errorMessage = useApiError();
  const router = useRouter();
  const [venues, setVenues] = useState<Role5Venue[]>([]);
  const [categories, setCategories] = useState<Role5Category[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('50');
  const [venueId, setVenueId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [venueResult, categoryResult, eventResult] = await Promise.all([
        listOrganizerVenues(),
        listOrganizerCategories(),
        eventId ? getOrganizerEvent(eventId) : Promise.resolve(null),
      ]);
      if (!active) return;
      if (venueResult.ok) setVenues(venueResult.data.venues);
      if (categoryResult.ok) {
        setCategories(categoryResult.data.categories);
        if (!eventId && categoryResult.data.categories[0]) {
          setCategoryId(categoryResult.data.categories[0].id);
        }
      }
      if (eventResult) {
        if (!eventResult.ok) {
          setError(eventResult.code);
          setLoading(false);
          return;
        }
        const event = eventResult.data.event;
        setTitle(event.title);
        setDescription(event.description);
        setStartsAt(toLocalInput(event.startsAt));
        setEndsAt(toLocalInput(event.endsAt));
        setCapacity(String(event.capacity));
        setVenueId(event.venueId ?? '');
        setCategoryId(event.categoryId);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const input: Role5EventInput = {
      title,
      description,
      startsAt: toIso(startsAt),
      endsAt: toIso(endsAt),
      capacity: Number(capacity),
      venueId: venueId || null,
      categoryId,
    };
    const result = eventId
      ? await updateOrganizerEvent(eventId, input)
      : await createOrganizerEvent(input);
    if (!result.ok) {
      setError(result.code);
      setSubmitting(false);
      return;
    }
    router.push('/organizer');
  }

  if (loading) return <p className="text-start text-slate-600">{t('common.loading')}</p>;

  return (
    <form onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4" noValidate>
      {error ? (
        <FormMessage kind="error">
          {error === 'VALIDATION' || error === 'NOT_FOUND' ? t(`errors.${error}`) : errorMessage(error)}
        </FormMessage>
      ) : null}

      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.title')}
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.description')}
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-24 rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.startsAt')}
        <input
          required
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.endsAt')}
        <input
          required
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.capacity')}
        <input
          required
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.venue')}
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">{t('event.noVenue')}</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-start text-sm">
        {t('event.category')}
        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <Link href="/organizer" className="px-4 py-2 text-blue-700 underline">
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  );
}
