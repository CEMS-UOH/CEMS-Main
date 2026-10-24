// The signed-in user's notification inbox (backend/src/modules/notifications/API.md).
// Shared by the header bell and the /notifications page, for every role.
import { apiFetch } from './api';

export type NotificationType =
  | 'BOOKING_CONFIRMATION'
  | 'CAPACITY_FULL'
  | 'EVENT_APPROVED'
  | 'EVENT_REJECTED'
  | 'BROADCAST'
  | 'SYSTEM';

export type AppNotification = {
  id: string;
  type: NotificationType;
  /** The event title, or an admin's own title for BROADCAST. */
  title: string;
  /** English fallback text - shown as-is only for BROADCAST and SYSTEM. */
  body: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationPage = {
  notifications: AppNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const listNotifications = ({
  unread = false,
  page = 1,
  limit = 20,
}: { unread?: boolean; page?: number; limit?: number } = {}) => {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (unread) query.set('unread', 'true');
  return apiFetch<NotificationPage>(`/api/notifications?${query}`);
};

export const markNotificationRead = (id: string) =>
  apiFetch<{ notification: AppNotification }>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: 'POST' }
  );

export const markAllNotificationsRead = () =>
  apiFetch<{ updated: number }>('/api/notifications/read-all', { method: 'POST' });

// The page tells the bell when the unread count changed, so the badge never lags behind.
const CHANGED = 'scems:notifications-changed';
export const announceNotificationsChanged = () => window.dispatchEvent(new Event(CHANGED));
export function onNotificationsChanged(listener: () => void) {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
}
