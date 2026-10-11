// The product mark and name, the same in every header: home page, sign-in pages, the attendee
// area and both dashboards.
//
// The mark is a plain calendar tile in the brand green. It is deliberately NOT the University
// of Hail crest: no official logo file has been provided, and one must not be imitated.

import { Link } from '@/i18n/navigation';
import { CalendarIcon } from './Icons';
import { FOCUS_RING } from './styles';

type Props = {
  /** The product name, already translated. */
  name: string;
  /** Where the brand links to. */
  href: string;
  /**
   * Show only the mark on a phone (the name stays available to screen readers). For headers
   * that also carry a role chip and a log out button, where the name would be crushed.
   */
  compact?: boolean;
};

export default function Brand({ name, href, compact = false }: Props) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-lg ${compact ? 'max-sm:shrink-0 sm:min-w-0' : 'min-w-0'} ${FOCUS_RING}`}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-white shadow-[var(--shadow-card)] transition-colors duration-150 group-hover:bg-primary-dark"
      >
        <CalendarIcon className="size-5" />
      </span>
      {/* Two short lines on a phone, one line from sm up - never cut off mid-word. */}
      <span
        className={`text-sm leading-tight font-bold text-primary-dark sm:line-clamp-1 sm:max-w-none sm:text-base ${
          compact ? 'sr-only sm:not-sr-only' : 'line-clamp-2 max-w-40'
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
