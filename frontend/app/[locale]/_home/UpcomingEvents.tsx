'use client';

// "Coming up" on the home page: the next approved events, straight from the public attendee
// API (GET /api/attendee/events) - real events, never sample content. Reuses the attendee
// area's own card, loader and states so an event looks the same here as in the feed.
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import { ForwardIcon } from '@/components/Icons';
import { listEvents } from '../(attendee)/_lib/attendee-api';
import { useQuery } from '../(attendee)/_lib/useQuery';
import EventCard from '../(attendee)/_ui/EventCard';
import { EmptyState, ErrorState, LoadingCards } from '../(attendee)/_ui/States';

const SHOWN = 3;

export default function UpcomingEvents() {
  const t = useTranslations('Home.upcoming');
  const query = useQuery('home-upcoming', () => listEvents({ limit: SHOWN }));

  if (query.errorCode) return <ErrorState code={query.errorCode} onRetry={query.reload} />;
  if (query.loading || !query.data) return <LoadingCards count={SHOWN} label={t('loading')} />;

  const { events } = query.data;
  if (events.length === 0) return <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />;

  return (
    <div className="flex flex-col gap-6">
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <li key={event.id} className="flex">
            <EventCard event={event} />
          </li>
        ))}
      </ul>
      <div>
        <Button href="/events" variant="secondary">
          {t('seeAll')}
          <ForwardIcon />
        </Button>
      </div>
    </div>
  );
}
