'use client';

// "Recommended for you" at the top of the events page, for a signed-in Attendee.
// Calls GET /api/attendee/recommendations. Each suggestion says why it is there (the
// attendee's favourite category, an organizer they rated well, or simply popular), so the
// list never feels arbitrary. Nothing is shown to guests, other roles, or when there is
// nothing to suggest - this section is a bonus, never a blocker for the feed below it.
import { useTranslations } from 'next-intl';
import { SparkIcon } from '@/components/Icons';
import { getRecommendations } from '../_lib/attendee-api';
import { useSession } from '../_lib/session';
import { useQuery } from '../_lib/useQuery';
import EventCard from './EventCard';

export default function Recommendations() {
  const t = useTranslations('Recommendations');
  const { session, user } = useSession();
  const isAttendee = session.status === 'user' && session.role === 'ATTENDEE';
  // A null key waits for the session; the user id keeps one account's list from showing for another.
  const query = useQuery(isAttendee && user ? `recommendations:${user.id}` : null, getRecommendations);

  if (!isAttendee || !query.data || query.data.events.length === 0) return null;
  const { basis, events } = query.data;

  return (
    <section aria-labelledby="recommended-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-start">
        <h2 id="recommended-title" className="type-h2 flex items-center gap-2 text-text">
          <SparkIcon className="size-5 text-primary" />
          {t('title')}
        </h2>
        <p className="text-sm text-text-muted">{basis === 'history' ? t('basisHistory') : t('basisPopular')}</p>
      </div>
      {/* Phones: one row to swipe through, so the full feed below is not pushed four cards down.
          Wider screens: a grid. Each card is `relative`: the visually hidden labels inside it
          (position: absolute) must belong to the card, or the ones in off-screen cards escape
          the row and widen the whole page in Arabic. */}
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {events.map((event) => (
          <li key={event.id} className="relative flex w-[80%] shrink-0 snap-start flex-col gap-2 sm:w-auto">
            <p className="text-start text-xs font-medium text-text-muted">
              {/* The category name may be in the other language: keep its own direction. */}
              {t.rich(`reason.${event.reason}`, {
                category: event.category.name,
                cat: (chunks) => <bdi>{chunks}</bdi>,
              })}
            </p>
            <div className="flex flex-1">
              <EventCard event={event} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
