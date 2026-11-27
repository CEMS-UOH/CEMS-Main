// Reminders before an event: one the day before, one an hour before, to every attendee holding
// a confirmed seat. OWNER: Role 2.
//
// runReminders() is idempotent - each booking records when each reminder went out
// (dayReminderSentAt, hourReminderSentAt), so it can run as often as we like. src/index.js
// runs it every few minutes. On a free host that sleeps when idle, a reminder whose window
// passed while asleep is skipped rather than sent late (a "tomorrow" reminder an hour before
// the start would be wrong).
const prisma = require('../../lib/prisma');

const HOUR = 60 * 60 * 1000;
const BATCH = 500;

async function sendBatch({ from, to, field, alsoMark }) {
  const due = await prisma.registration.findMany({
    where: {
      status: 'CONFIRMED',
      [field]: null,
      event: { status: 'APPROVED', startsAt: { gt: from, lte: to } },
    },
    select: { id: true, userId: true, event: { select: { title: true, startsAt: true } } },
    take: BATCH,
  });
  if (due.length === 0) return 0;

  const now = new Date();
  await prisma.$transaction([
    // One transaction: the reminders and the "sent" marks are written together, so a crash
    // cannot leave a reminder sent but unmarked (sent again next run) or marked but unsent.
    // Assumes one backend instance runs this, which is the current deployment.
    prisma.registration.updateMany({
      where: { id: { in: due.map((r) => r.id) }, [field]: null },
      data: { [field]: now, ...(alsoMark ? { [alsoMark]: now } : {}) },
    }),
    prisma.notification.createMany({
      data: due.map((r) => ({
        userId: r.userId,
        type: 'EVENT_REMINDER',
        title: r.event.title,
        // The UI writes the reminder in the reader's language from the start time stored here
        // ("starts tomorrow at 4:00 PM" / "starts in an hour"); keep it a bare ISO date.
        body: r.event.startsAt.toISOString(),
      })),
    }),
  ]);
  return due.length;
}

async function runReminders(now = new Date()) {
  // The hour reminder first; it also marks the day reminder, which would now be pointless.
  const hour = await sendBatch({
    from: now,
    to: new Date(now.getTime() + HOUR),
    field: 'hourReminderSentAt',
    alsoMark: 'dayReminderSentAt',
  });
  const day = await sendBatch({
    from: new Date(now.getTime() + HOUR),
    to: new Date(now.getTime() + 24 * HOUR),
    field: 'dayReminderSentAt',
  });
  return { hour, day };
}

module.exports = { runReminders };
