'use client';

// The bell in the header of every signed-in screen. It links to /notifications and shows how
// many are unread. The count is fetched when the bell appears, when the user moves to another
// page, when they come back to the tab, and whenever the notifications page marks some read.
// No timer polling: that would keep a slow database busy for a number nobody is looking at.
import { useCallback, useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { listNotifications, onNotificationsChanged } from '@/lib/notifications';
import Button from './Button';
import { BellIcon } from './Icons';

export default function NotificationBell() {
  const t = useTranslations('Notifications');
  const format = useFormatter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const result = await listNotifications({ limit: 1 });
    // Any failure keeps the last known count; the bell itself still works as a link.
    if (result.ok) setUnread(result.data.unreadCount);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onFocus);
    const stop = onNotificationsChanged(refresh);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      stop();
    };
  }, [refresh]);

  const active = pathname === '/notifications';

  return (
    <Button
      href="/notifications"
      variant="ghost"
      size="sm"
      aria-label={t('bellLabel', { count: unread })}
      aria-current={active ? 'page' : undefined}
      className={`relative px-2 ${active ? 'bg-primary-light' : ''}`}
    >
      <BellIcon className="size-5" />
      {unread > 0 ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -end-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[0.6875rem] leading-5 font-bold text-white tabular-nums ring-2 ring-surface"
        >
          {unread > 99 ? format.number(99) + '+' : format.number(unread)}
        </span>
      ) : null}
    </Button>
  );
}
