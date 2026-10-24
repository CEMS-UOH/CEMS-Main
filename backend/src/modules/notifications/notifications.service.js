// The notification inbox. Rows are created elsewhere (bookings, admin approval/rejection,
// broadcast); this module only lets each user read their own and mark them read.
// Input is already validated by the controller.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  isRead: true,
  createdAt: true,
};

async function listNotifications({ userId, unreadOnly, page, limit }) {
  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: NOTIFICATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return {
    notifications,
    unreadCount,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Someone else's notification is reported exactly like a missing one. */
async function markRead({ userId, id }) {
  const found = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true, isRead: true },
  });
  if (!found || found.userId !== userId) {
    throw new HttpError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
    select: NOTIFICATION_SELECT,
  });
}

async function markAllRead(userId) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: count };
}

module.exports = { listNotifications, markRead, markAllRead };
