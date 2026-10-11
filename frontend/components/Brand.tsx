// The product mark and name, the same in every header: home page, sign-in pages, the attendee
// area and both dashboards.
//
// The mark is the team's own logo file, public/logo.webp, shown exactly as supplied - it is
// only ever scaled, never redrawn. The favicon sizes in app/ are resized copies of that file.

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
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
      className={`group flex items-center gap-2 rounded-lg sm:gap-3 ${compact ? 'max-sm:shrink-0 sm:min-w-0' : 'min-w-0'} ${FOCUS_RING}`}
    >
      {/*
        The logo file has a wide white margin around the drawing (the drawing is 71% of the
        canvas, centred slightly up and left). Shown at face value, the mark looks small and
        sits away from the name. So it is zoomed inside a 40px window until the drawing itself
        fills the window - the file is untouched, only its empty margin falls outside the
        frame. That keeps the mark the same height as the buttons across the header.

        Decorative here: the product name right beside it says the same thing. `unoptimized`
        serves the supplied file itself rather than a re-encoded copy.
      */}
      <span className="block size-10 shrink-0 overflow-hidden">
        <Image
          src="/logo.webp"
          alt=""
          width={40}
          height={40}
          unoptimized
          priority
          className="size-full origin-[47.8%_48.1%] translate-x-[2.2%] translate-y-[1.9%] scale-[1.35]"
        />
      </span>
      {/* Two short lines on a phone, one line from sm up - never cut off mid-word. */}
      <span
        className={`text-xs leading-tight font-bold text-primary-dark transition-colors duration-150 group-hover:text-primary sm:line-clamp-1 sm:max-w-none sm:text-base ${
          compact ? 'sr-only sm:not-sr-only' : 'line-clamp-2 max-w-40'
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
