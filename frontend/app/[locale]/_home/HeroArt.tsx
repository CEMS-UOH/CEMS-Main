// Decorative picture for the home page: a calendar month with a few days marked, and a ticket
// tucked under its corner. Drawn from the design system's own shapes and colours, so it needs
// no image file and carries no text or data - screen readers skip it entirely.

import Card from '@/components/Card';
import { CheckIcon, TicketIcon } from '@/components/Icons';

// 5 weeks x 7 days. 'on' = a day with an event, 'soft' = a lighter mark, '' = an ordinary day.
const DAYS = [
  '', '', 'soft', '', '', 'on', '',
  '', 'on', '', '', 'soft', '', '',
  '', '', '', 'on', '', '', 'soft',
  'soft', '', '', '', 'on', '', '',
  '', '', 'on', '', '', '', '',
];

const DAY_CLASSES: Record<string, string> = {
  on: 'bg-primary',
  soft: 'bg-primary-light',
  '': 'bg-background',
};

export default function HeroArt() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md pb-10">
      {/* Soft tinted plate behind the calendar, so it does not float on plain white. */}
      <div className="absolute inset-x-6 -top-6 bottom-4 rounded-lg bg-linear-to-br from-primary-light via-surface to-background" />

      <Card className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="h-3 w-28 rounded-full bg-primary-dark/80" />
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((kind, i) => (
            <span key={i} className={`aspect-square rounded-md ${DAY_CLASSES[kind]}`} />
          ))}
        </div>
      </Card>

      <Card className="absolute -start-2 bottom-0 flex w-56 items-center gap-3 sm:-start-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
          <TicketIcon className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="h-2.5 w-full rounded-full bg-text/80" />
          <span className="h-2 w-2/3 rounded-full bg-border" />
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success-light text-success">
          <CheckIcon />
        </span>
      </Card>
    </div>
  );
}
