// FR-21: one BROADCAST notification per active user. OWNER: Role 3.
const prisma = require('../../lib/prisma');

async function broadcast({ title, body }) {
  const activeUsers = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  if (activeUsers.length === 0) return { notified: 0 };

  await prisma.notification.createMany({
    data: activeUsers.map((u) => ({ userId: u.id, type: 'BROADCAST', title, body })),
  });

  return { notified: activeUsers.length };
}

module.exports = { broadcast };
