'use client';

// FR-11: edit the organizer's own event (only PENDING/APPROVED, only before it starts - the
// API reports that as `canEdit`). Calls GET /api/organizer/events/:id, GET categories,
// GET venues, PATCH /api/organizer/events/:id.
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import FormMessage from '@/components/FormMessage';
import { Link } from '@/i18n/navigation';
import type { ApiResult } from '@/lib/api';
import { BackIcon } from '@/components/Icons';
import { TEXT_LINK } from '@/components/styles';
import PageHeader from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../../../_dashboard/ui/States';
import type { Category, OrganizerEvent, Venue } from '../../../../../_dashboard/lib/types';
import { useApiQuery } from '../../../../../_dashboard/lib/useApiQuery';
import {
  getMyEvent,
  listCategories,
  listVenues,
  updateEvent,
} from '../../../../_lib/organizer-api';
import EventForm from '../../../../_ui/EventForm';

type EditData = { event: OrganizerEvent; categories: Category[]; venues: Venue[] };

/** The event and both lookup lists in parallel - none depends on another. */
async function loadEditData(id: string): Promise<ApiResult<EditData>> {
  const [event, categories, venues] = await Promise.all([
    getMyEvent(id),
    listCategories(),
    listVenues(),
  ]);
  if (!event.ok) return event;
  if (!categories.ok) return categories;
  if (!venues.ok) return venues;
  return {
    ok: true,
    status: 200,
    data: {
      event: event.data.event,
      categories: categories.data.categories,
      venues: venues.data.venues,
    },
  };
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations('Organizer.form');
  const tNav = useTranslations('Organizer');

  const [saved, setSaved] = useState(false);
  const query = useApiQuery(`organizer-edit:${id}`, () => loadEditData(id));

  const backLink = (
    <Link href="/organizer" className={`flex w-fit items-center gap-1.5 ${TEXT_LINK}`}>
      <BackIcon />
      {tNav('backToEvents')}
    </Link>
  );

  return (
    <>
      <PageHeader
        title={t('editTitle')}
        subtitle={query.data ? query.data.event.title : undefined}
        eyebrow={backLink}
      />

      {query.loading ? (
        <LoadingState />
      ) : query.errorCode || !query.data ? (
        <ErrorState code={query.errorCode ?? 'UNKNOWN'} onRetry={query.reload} />
      ) : !query.data.event.canEdit ? (
        <EmptyState title={t('notEditable')} />
      ) : (
        <>
          {saved ? <FormMessage kind="success">{t('saved')}</FormMessage> : null}
          <EventForm
            initial={query.data.event}
            categories={query.data.categories}
            venues={query.data.venues}
            submitLabel={t('submitEdit')}
            onSubmit={(input) => {
              setSaved(false);
              return updateEvent(id, input);
            }}
            onSuccess={() => setSaved(true)}
          />
        </>
      )}
    </>
  );
}
