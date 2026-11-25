// An attendance certificate exists for a booking that was checked in at the door (FR-14) of an
// approved event. Nothing is stored: the certificate is the booking, read back.
const prisma = require('../../lib/prisma');
const { HttpError } = require('../../lib/response');

async function getCertificate(id) {
  const booking = await prisma.registration.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      checkedInAt: true,
      user: { select: { fullName: true } },
      event: {
        select: {
          title: true,
          status: true,
          startsAt: true,
          endsAt: true,
          category: { select: { name: true } },
          venue: { select: { name: true } },
          organizer: { select: { fullName: true, organization: true } },
        },
      },
    },
  });
  // A booking nobody attended, or an event that is no longer published, has no certificate -
  // and the answer is the same "not found" either way, so nothing about the booking leaks.
  if (!booking || !booking.checkedInAt || booking.status !== 'CONFIRMED' || booking.event.status !== 'APPROVED') {
    throw new HttpError(404, 'Certificate not found', 'CERTIFICATE_NOT_FOUND');
  }
  const { event } = booking;
  return {
    id: booking.id,
    attendeeName: booking.user.fullName,
    eventTitle: event.title,
    category: event.category.name,
    venue: event.venue?.name ?? null,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    // Who ran the event: the club or department if the organizer gave one, else their name.
    issuedBy: event.organizer.organization || event.organizer.fullName,
    attendedAt: booking.checkedInAt,
  };
}

module.exports = { getCertificate };
