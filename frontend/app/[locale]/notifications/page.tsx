'use client';

// The notification inbox, for every role (FR-06, FR-15, FR-17 outcome, FR-21).
// Calls GET /api/notifications, POST /api/notifications/:id/read and /read-all
// (backend/src/modules/notifications/API.md).
//
// Each notification is written out here by its `type`, in the reader's language, with the
// event title filled in. Only an admin's announcement (BROADCAST) or a SYSTEM message shows
// the stored text as-is, because a person wrote it.
import { useState, type ReactNode } from 'react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import AppHeader, { type HeaderNavItem } from '@/components/AppHeader';
import Button from '@/components/Button';
import { cardClasses } from '@/components/Card';
import FormMessage from '@/components/FormMessage';
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
  GridIcon,
  MegaphoneIcon,
  SeatIcon,
  TicketIcon,
  UserIcon,
} from '@/components/Icons';
import LocaleSwitcher from '@/components/LocaleSwitcher';
import NotificationBell from '@/components/NotificationBell';
import ChatAssistant from '@/components/ChatAssistant';
import PageHeader from '@/components/PageHeader';
import { FRAME, TEXT_LINK } from '@/components/styles';
import { Link } from '@/i18n/navigation';
import { getMe, type PublicUser } from '@/lib/api';
import {
  announceNotificationsChanged,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type NotificationType,
} from '@/lib/notifications';
import { HOME_BY_ROLE } from '@/lib/roleHome';
import { useApiQuery } from '../_dashboard/lib/useApiQuery';
import { useDashboardError } from '../_dashboard/lib/useDashboardError';
import Pagination from '../_dashboard/ui/Pagination';
import { EmptyState, ErrorState, LoadingState } from '../_dashboard/ui/States';

const PAGE_SIZE = 15;

/** The picture beside each kind of notification, and where it leads. */
const KIND: Record<NotificationType, { icon: ReactNode; tone: string; href?: string }> = {
  BOOKING_CONFIRMATION: { icon: <TicketIcon className="size-5" />, tone: 'bg-success-light text-success', href: '/bookings' },
  CAPACITY_FULL: { icon: <SeatIcon className="size-5" />, tone: 'bg-accent-light text-accent-dark', href: '/organizer' },
  EVENT_APPROVED: { icon: <CheckIcon className="size-5" />, tone: 'bg-success-light text-success', href: '/organizer' },
  EVENT_REJECTED: { icon: <CloseIcon className="size-5" />, tone: 'bg-danger-light text-danger', href: '/organizer' },
  BROADCAST: { icon: <MegaphoneIcon className="size-5" />, tone: 'bg-primary-light text-primary' },
  SYSTEM: { icon: <BellIcon className="size-5" />, tone: 'bg-primary-light text-primary' },
};

/** Written by a person, so shown as stored rather than from our translations. */
const isFreeText = (type: NotificationType) => type === 'BROADCAST' || type === 'SYSTEM';

export default function NotificationsPage() {
  const tDash = useTranslations('Dashboard');
  // 401 sends the visitor to /login (inside useApiQuery).
  const session = useApiQuery('session', getMe);

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session.data?.user ?? null} />
      <main id="notifications-main" className={`${FRAME} flex flex-1 flex-col gap-6 pt-8 pb-16 sm:pt-10`}>
        {session.loading ? (
          <LoadingState label={tDash('checkingSession')} />
        ) : session.errorCode || !session.data ? (
          <ErrorState code={session.errorCode ?? 'UNKNOWN'} onRetry={session.reload} />
        ) : (
          <Inbox key={session.data.user.id} />
        )}
      </main>
    </div>
  );
}

function Header({ user }: { user: PublicUser | null }) {
  const t = useTranslations('Notifications');
  const tAttendee = useTranslations('AttendeeNav');
  const tDash = useTranslations('Dashboard');

  // The way back to the rest of the user's own area, then this page.
  const nav: HeaderNavItem[] = [];
  if (user?.role === 'ATTENDEE') {
    nav.push(
      { href: '/events', label: tAttendee('events'), icon: <CalendarIcon />, active: false },
      { href: '/bookings', label: tAttendee('bookings'), icon: <TicketIcon />, active: false }
    );
  } else if (user) {
    nav.push({ href: HOME_BY_ROLE[user.role], label: t(`area.${user.role}`), icon: <GridIcon />, active: false });
  }
  nav.push({ href: '/notifications', label: t('title'), icon: <BellIcon />, active: true });

  return (
    <AppHeader
      productName={tDash('productName')}
      homeHref={user ? HOME_BY_ROLE[user.role] : '/'}
      navLabel={t('navLabel')}
      mainId="notifications-main"
      skipLabel={tDash('skipToContent')}
      nav={nav}
      tools={
        <>
          <LocaleSwitcher />
          {user ? (
            <>
              <ChatAssistant userId={user.id} />
              <NotificationBell />
              <Button href="/me" variant="secondary" size="sm" icon={<UserIcon />} className="sm:max-w-48">
                <span className="truncate max-sm:sr-only">{user.fullName}</span>
              </Button>
            </>
          ) : null}
        </>
      }
    />
  );
}

function Inbox() {
  const t = useTranslations('Notifications');
  const errorMessage = useDashboardError();

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useApiQuery(`notifications:${unreadOnly}:${page}`, () =>
    listNotifications({ unread: unreadOnly, page, limit: PAGE_SIZE })
  );
  const unreadCount = list.data?.unreadCount ?? 0;

  function changed() {
    list.reload();
    announceNotificationsChanged();
  }

  async function onMarkAll() {
    setError(null);
    setMarkingAll(true);
    const result = await markAllNotificationsRead();
    setMarkingAll(false);
    if (!result.ok) {
      setError(errorMessage(result.code));
      return;
    }
    setPage(1);
    changed();
  }

  async function onMarkRead(id: string, quiet = false) {
    if (!quiet) {
      setError(null);
      setMarkingId(id);
    }
    const result = await markNotificationRead(id);
    if (!quiet) setMarkingId(null);
    if (!result.ok) {
      if (!quiet) setError(errorMessage(result.code));
      return;
    }
    // In the unread view, the last one on a later page would leave that page empty.
    if (unreadOnly && list.data?.notifications.length === 1 && page > 1) setPage(page - 1);
    changed();
  }

  const filters = [
    { value: false, label: t('filterAll') },
    { value: true, label: t('filterUnread', { count: unreadCount }) },
  ];

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" icon={<CheckIcon />} loading={markingAll} onClick={onMarkAll}>
              {markingAll ? t('markingAll') : t('markAll')}
            </Button>
          ) : undefined
        }
      />

      {/* Two views of the same inbox. Real toggle buttons: the pressed one is the view shown. */}
      <div role="group" aria-label={t('filterLabel')} className="flex w-fit gap-1 rounded-lg border border-border bg-surface p-1">
        {filters.map((filter) => {
          const pressed = unreadOnly === filter.value;
          return (
            <button
              key={String(filter.value)}
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                setUnreadOnly(filter.value);
                setPage(1);
              }}
              className={`min-h-9 cursor-pointer rounded-md px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                pressed ? 'bg-primary text-white' : 'text-text-muted hover:bg-primary-light hover:text-primary-dark'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {error ? <FormMessage kind="error">{error}</FormMessage> : null}

      {list.loading ? (
        <LoadingState />
      ) : list.errorCode || !list.data ? (
        <ErrorState code={list.errorCode ?? 'UNKNOWN'} onRetry={list.reload} />
      ) : list.data.notifications.length === 0 ? (
        unreadOnly ? (
          <EmptyState title={t('emptyUnreadTitle')} body={t('emptyUnreadBody')} />
        ) : (
          <EmptyState title={t('emptyTitle')} body={t('emptyBody')} />
        )
      ) : (
        <>
          <ul
            aria-busy={list.refreshing}
            className={`flex flex-col gap-3 ${list.refreshing ? 'opacity-60' : ''}`}
          >
            {list.data.notifications.map((item) => (
              <li key={item.id}>
                <NotificationItem
                  item={item}
                  marking={markingId === item.id}
                  onMarkRead={() => onMarkRead(item.id)}
                  onOpen={() => (item.isRead ? undefined : onMarkRead(item.id, true))}
                />
              </li>
            ))}
          </ul>
          <Pagination pagination={list.data.pagination} onPageChange={setPage} disabled={list.refreshing} />
        </>
      )}
    </>
  );
}

function NotificationItem({
  item,
  marking,
  onMarkRead,
  onOpen,
}: {
  item: AppNotification;
  marking: boolean;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations('Notifications');
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const kind = KIND[item.type] ?? KIND.SYSTEM;
  const createdAt = new Date(item.createdAt);

  const heading = isFreeText(item.type) ? item.title : t(`types.${item.type}.title`);
  // The event title is isolated (<bdi>) so an Arabic title inside an English sentence, or the
  // other way round, keeps its own direction instead of scrambling the line.
  const text = isFreeText(item.type)
    ? item.body
    : t.rich(`types.${item.type}.body`, {
        title: item.title,
        event: (chunks) => <bdi className="font-medium text-text">{chunks}</bdi>,
      });

  return (
    <article
      className={`${cardClasses({ padded: false })} flex gap-4 p-4 sm:p-5 ${
        item.isRead ? '' : 'border-primary/40 bg-primary-light/40'
      }`}
    >
      <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-lg ${kind.tone}`}>
        {kind.icon}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1 text-start">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2
            dir={isFreeText(item.type) ? 'auto' : undefined}
            className="text-base font-bold text-text [overflow-wrap:anywhere]"
          >
            {!item.isRead ? (
              <>
                <span aria-hidden className="me-2 inline-block size-2 rounded-full bg-primary align-middle" />
                <span className="sr-only">{t('unreadMark')} </span>
              </>
            ) : null}
            {heading}
          </h2>
          {isFreeText(item.type) ? (
            <span className="text-xs font-medium text-text-muted">· {t(`types.${item.type}.label`)}</span>
          ) : null}
        </div>
        {/* Text an admin wrote may be in either language: let the browser pick its direction. */}
        <p
          dir={isFreeText(item.type) ? 'auto' : undefined}
          className="text-sm whitespace-pre-line text-text-muted [overflow-wrap:anywhere]"
        >
          {text}
        </p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <time
            dateTime={item.createdAt}
            title={format.dateTime(createdAt, { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Riyadh' })}
            className="text-xs text-text-muted"
          >
            {format.relativeTime(createdAt, now)}
          </time>
          {kind.href ? (
            <Link
              href={kind.href}
              onClick={onOpen}
              className={`text-sm ${TEXT_LINK}`}
            >
              {t(`open.${item.type}`)}
            </Link>
          ) : null}
          {!item.isRead ? (
            <Button variant="ghost" size="sm" loading={marking} onClick={onMarkRead} className="-mx-3">
              {t('markRead')}
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
