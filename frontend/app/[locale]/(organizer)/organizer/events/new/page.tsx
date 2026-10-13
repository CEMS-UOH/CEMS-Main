'use client';

// FR-10: create an event. It is always created PENDING and waits for an admin's approval.
// Calls GET /api/organizer/categories, GET /api/organizer/venues, POST /api/organizer/events,
// and GET /api/organizer/events (totals only) to know whether the new-organizer limit applies.
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Card from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/Button';
import { BackIcon } from '@/components/Icons';
import { TEXT_LINK } from '@/components/styles';
import PageHeader from '@/components/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../../../_dashboard/ui/States';
import { bothOk, useApiQuery } from '../../../../_dashboard/lib/useApiQuery';
import { createEvent, listCategories, listVenues } from '../../../_lib/organizer-api';
import { loadRequestLimit } from '../../../_lib/requestLimit';
import EventForm from '../../../_ui/EventForm';

export default function NewEventPage() {
  const t = useTranslations('Organizer.form');
  const tNav = useTranslations('Organizer');
  const tLimit = useTranslations('Organizer.limit');

  const [created, setCreated] = useState(false);
  // Remounts the form with empty fields for "Create another".
  const [formKey, setFormKey] = useState(0);

  const reference = useApiQuery('organizer-reference', async () =>
    bothOk(...(await Promise.all([listCategories(), listVenues()])))
  );
  // A new organizer may have one request waiting; see _lib/requestLimit.ts.
  const limit = useApiQuery('organizer-request-limit', loadRequestLimit);
  const limited = limit.data?.limited ?? false;

  const backLink = (
    <Link href="/organizer" className={`flex w-fit items-center gap-1.5 ${TEXT_LINK}`}>
      <BackIcon />
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
            <Button href="/organizer">{tNav('backToEvents')}</Button>
            {/* Offered only once we know another request is allowed - for a new organizer
                the one just sent has used the single slot. */}
            {limit.data && !limit.loading && !limit.refreshing && !limited ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setFormKey((k) => k + 1);
                  setCreated(false);
                }}
              >
                {t('createAnother')}
              </Button>
            ) : null}
          </div>
        </Card>
      </>
    );
  }

  const loading = reference.loading || limit.loading;
  const errorCode = reference.errorCode ?? limit.errorCode;

  return (
    <>
      <PageHeader title={t('createTitle')} subtitle={t('createSubtitle')} eyebrow={backLink} />

      {loading ? (
        <LoadingState />
      ) : errorCode || !reference.data || !limit.data ? (
        <ErrorState
          code={errorCode ?? 'UNKNOWN'}
          onRetry={() => {
            reference.reload();
            limit.reload();
          }}
        />
      ) : limited ? (
        <EmptyState
          title={tLimit('title')}
          body={tLimit('body')}
          action={
            <Button href="/organizer" variant="secondary">
              {tLimit('back')}
            </Button>
          }
        />
      ) : (
        <EventForm
          key={formKey}
          categories={reference.data[0].categories}
          venues={reference.data[1].venues}
          submitLabel={t('submitCreate')}
          onSubmit={createEvent}
          onSuccess={() => {
            setCreated(true);
            limit.reload(); // the request just sent may have used the single slot
          }}
        />
      )}
    </>
  );
}
