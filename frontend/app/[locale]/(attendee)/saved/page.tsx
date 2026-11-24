'use client';

// The events an Attendee saved with the heart. Calls GET /api/attendee/favorites.
// Past events stay listed (dimmed into their own group) so a saved event never silently vanishes.
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import { HeartIcon } from '@/components/Icons';
import PageHeader from '@/components/PageHeader';
import { useRouter } from '@/i18n/navigation';
import { listSaved } from '../_lib/attendee-api';
import { useSaved } from '../_lib/saved';
import { useSession } from '../_lib/session';
import { useQuery } from '../_lib/useQuery';
import EventCard from '../_ui/EventCard';
import { EmptyState, ErrorState, LoadingCards } from '../_ui/States';

export default function SavedPage() {
  const t = useTranslations('Saved');
  const router = useRouter();
  const { session, user } = useSession();
  const saved = useSaved();
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  // `version` changes whenever a heart is pressed, so un-saving here updates the list.
  const query = useQuery(isAttendee && user ? `saved:${user.id}:${saved?.version ?? 0}` : null, listSaved);

  useEffect(() => {
    if (session.status === 'guest') router.replace('/login');
  }, [session.status, router]);

  const now = Date.now();
  const events = query.data?.events ?? [];
  const upcoming = events.filter((e) => new Date(e.endsAt).getTime() > now);
  const past = events.filter((e) => new Date(e.endsAt).getTime() <= now);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {session.status !== 'user' || (query.loading && !query.data) ? (
        <LoadingCards count={3} />
      ) : !isAttendee ? (
        <EmptyState title={t('attendeesOnly')} />
      ) : query.errorCode ? (
        <ErrorState code={query.errorCode} onRetry={query.reload} />
      ) : events.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button href="/events" icon={<HeartIcon className="size-4" />}>
              {t('browse')}
            </Button>
          }
        />
      ) : (
        <>
          {upcoming.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <li key={event.id} className="flex">
                  <EventCard event={event} />
                </li>
              ))}
            </ul>
          ) : null}
          {past.length > 0 ? (
            <section aria-labelledby="saved-past" className="flex flex-col gap-4">
              <h2 id="saved-past" className="type-h3 text-start text-text-muted">
                {t('past')}
              </h2>
              <ul className="grid gap-5 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((event) => (
                  <li key={event.id} className="flex">
                    <EventCard event={event} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
