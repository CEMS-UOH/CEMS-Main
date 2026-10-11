'use client';

// FR-10: create an event. It is always created PENDING and waits for an admin's approval.
// Calls GET /api/organizer/categories, GET /api/organizer/venues, POST /api/organizer/events.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import { Link, useRouter } from '@/i18n/navigation';
import Button from '../../../../_dashboard/ui/Button';
import { TEXT_LINK } from '../../../../_dashboard/ui/focus';
import PageHeader from '../../../../_dashboard/ui/PageHeader';
import { ErrorState, LoadingState } from '../../../../_dashboard/ui/States';
import { bothOk, useApiQuery } from '../../../../_dashboard/lib/useApiQuery';
import { createEvent, listCategories, listVenues } from '../../../_lib/organizer-api';
import EventForm from '../../../_ui/EventForm';

export default function NewEventPage() {
  const t = useTranslations('Organizer.form');
  const tNav = useTranslations('Organizer');
  const router = useRouter();

  const [created, setCreated] = useState(false);
  // Remounts the form with empty fields for "Create another".
  const [formKey, setFormKey] = useState(0);

  const reference = useApiQuery('organizer-reference', async () =>
    bothOk(...(await Promise.all([listCategories(), listVenues()])))
  );

  const backLink = (
    <Link href="/organizer" className={TEXT_LINK}>
      {tNav('backToEvents')}
    </Link>
  );

  if (created) {
    return (
      <>
        <PageHeader title={t('createTitle')} eyebrow={backLink} />
        <Card className="flex flex-col gap-4">
          <FormMessage kind="success">{t('created')}</FormMessage>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => router.push('/organizer')}>{tNav('backToEvents')}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFormKey((k) => k + 1);
                setCreated(false);
              }}
            >
              {t('createAnother')}
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title={t('createTitle')} subtitle={t('createSubtitle')} eyebrow={backLink} />

      {reference.loading ? (
        <LoadingState />
      ) : reference.errorCode || !reference.data ? (
        <ErrorState code={reference.errorCode ?? 'UNKNOWN'} onRetry={reference.reload} />
      ) : (
        <EventForm
          key={formKey}
          categories={reference.data[0].categories}
          venues={reference.data[1].venues}
          submitLabel={t('submitCreate')}
          onSubmit={createEvent}
          onSuccess={() => setCreated(true)}
        />
      )}
    </>
  );
}
