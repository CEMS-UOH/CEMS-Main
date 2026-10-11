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
      className={`group flex items-center gap-2.5 rounded-lg ${compact ? 'max-sm:shrink-0 sm:min-w-0' : 'min-w-0'} ${FOCUS_RING}`}
    >
      {/* Decorative here: the product name right beside it says the same thing. `unoptimized`
          serves the supplied file itself rather than a re-encoded copy. */}
      <Image
        src="/logo.webp"
        alt=""
        width={48}
        height={48}
        unoptimized
        priority
        className="size-12 shrink-0"
      />
      {/* Two short lines on a phone, one line from sm up - never cut off mid-word. */}
      <span
        className={`text-sm leading-tight font-bold text-primary-dark transition-colors duration-150 group-hover:text-primary sm:line-clamp-1 sm:max-w-none sm:text-base ${
          compact ? 'sr-only sm:not-sr-only' : 'line-clamp-2 max-w-40'
        }`}
      >
        {name}
      </span>
    </Link>
  );
}
