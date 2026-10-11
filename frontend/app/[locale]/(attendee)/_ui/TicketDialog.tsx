'use client';

// The booking ticket (FR-05): event summary and the QR code organizers scan at the entrance
// (FR-14). A native <dialog> gives focus trapping, Esc to close and the backdrop for free.
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/Button';
import type { Booking } from '../_lib/attendee-api';
import { useEventDates } from '../_lib/format';
import { FOCUS_RING } from '../_lib/styles';
import { CalendarIcon, CheckIcon, CloseIcon, PinIcon, TicketIcon } from './Icons';
import QrCode from './QrCode';

type TicketBooking = Pick<Booking, 'qrCode' | 'checkedInAt'> & {
  event: Pick<Booking['event'], 'title' | 'startsAt' | 'endsAt' | 'venue'>;
};

type Props = {
  booking: TicketBooking | null;
  onClose: () => void;
};

export default function TicketDialog({ booking, onClose }: Props) {
  const t = useTranslations('Ticket');
  const dates = useEventDates();
  const ref = useRef<HTMLDialogElement>(null);
  const open = Boolean(booking?.qrCode);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="ticket-title"
      onClose={onClose}
      // A click on the backdrop lands on the <dialog> element itself, never on its content.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-lg bg-surface p-0 text-text shadow-[var(--shadow-card-hover)] backdrop:bg-primary-dark/60"
    >
      {booking?.qrCode ? (
        <div className="flex flex-col gap-5 p-5 text-start">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ticket-title" className="flex items-center gap-2 text-lg font-bold">
              <TicketIcon className="size-5 text-primary" />
              {t('title')}
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={t('close')}
              className={`grid size-9 place-items-center rounded-lg text-text-muted hover:bg-background hover:text-text ${FOCUS_RING}`}
            >
              <CloseIcon className="size-5" />
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <p className="text-base font-bold">{booking.event.title}</p>
            <p className="flex items-start gap-2 text-sm text-text-muted">
              <CalendarIcon className="mt-0.5 size-4 shrink-0" />
              {dates.range(booking.event.startsAt, booking.event.endsAt)}
            </p>
            {booking.event.venue ? (
              <p className="flex items-start gap-2 text-sm text-text-muted">
                <PinIcon className="mt-0.5 size-4 shrink-0" />
                {booking.event.venue.name}
              </p>
            ) : null}
          </div>

          <div className="mx-auto w-full max-w-64 rounded-lg border border-border bg-white p-2">
            <QrCode value={booking.qrCode} label={t('qrLabel')} className="h-auto w-full" />
          </div>

          {booking.checkedInAt ? (
            <p className="flex items-center justify-center gap-2 rounded-lg bg-success-light px-3 py-2 text-sm font-medium text-success">
              <CheckIcon />
              {t('checkedIn')}
            </p>
          ) : (
            <p className="text-center text-sm text-text-muted">{t('hint')}</p>
          )}

          <Button type="button" variant="secondary" onClick={() => ref.current?.close()}>
            {t('done')}
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}
