// Small inline icons for every screen (24px grid, stroke = currentColor). One set, so the
// attendee, organizer and admin areas never drift apart.
// Decorative: every icon sits next to text that says the same thing, so they are aria-hidden.

type Props = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const;

export function CalendarIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function PinIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function SeatIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
    </svg>
  );
}

export function UserIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.8-3.7 3.8-6 7.5-6s6.7 2.3 7.5 6" />
    </svg>
  );
}

export function SearchIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function TicketIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5Z" />
      <path d="M14.5 5.5v2M14.5 11v2M14.5 16.5v2" />
    </svg>
  );
}

export function PaperclipIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7.1-7.1l8.1-8.1a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.5-2.4l7.4-7.4" />
    </svg>
  );
}

export function CheckIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CloseIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Points "back" in the reading direction: left in English, right in Arabic. */
export function BackIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={`${className} rtl:-scale-x-100`}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Points "forward" in the reading direction. */
export function ForwardIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={`${className} rtl:-scale-x-100`}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function StarIcon({ className = 'size-6', filled }: Props & { filled: boolean }) {
  return (
    <svg {...base} strokeWidth={1.5} fill={filled ? 'currentColor' : 'none'} className={className}>
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" />
    </svg>
  );
}

export function PlusIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Something went wrong: used by the shared error state. */
export function AlertIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4 3 19.5h18L12 4Z" />
      <path d="M12 10v4.5M12 17.2v.3" />
    </svg>
  );
}

/** Nothing here yet: used by the shared empty state. */
export function InboxIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 13.5 6 5.5h12l2.5 8v4a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-4Z" />
      <path d="M3.5 13.5h4.7a1 1 0 0 1 .9.6 3.2 3.2 0 0 0 5.8 0 1 1 0 0 1 .9-.6h4.7" />
    </svg>
  );
}

/** Lost: used by the not-found page. */
export function CompassIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.2 8.8-1.9 4.5-4.5 1.9 1.9-4.5 4.5-1.9Z" />
    </svg>
  );
}

/** Language switch. */
export function GlobeIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5Z" />
    </svg>
  );
}

/** Dashboard sections. */
export function GridIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </svg>
  );
}

export function UsersIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
      <path d="M16 5.7a3.2 3.2 0 0 1 0 5.6M18 14.6c1.6.7 2.6 2.2 3 4.4" />
    </svg>
  );
}

export function TagIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h6l8.5 8.5-7.5 7.5L4 11.5v-6Z" />
      <circle cx="8.5" cy="8.5" r="1.3" />
    </svg>
  );
}

export function MegaphoneIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5l7.5 4V5l-7.5 4H5a1 1 0 0 0-1 1Z" />
      <path d="M18 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}

/** Notifications: the bell in every signed-in header. */
export function BellIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} className={className}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4.5 1.5 6 2 6.5H4c.5-.5 2-2 2-6.5Z" />
      <path d="M10 19.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

/**
 * Loading. The only icon that moves, and it keeps moving for people who ask for reduced
 * motion: a frozen spinner reads as a broken icon, not as "working".
 */
export function SpinnerIcon({ className = 'size-4' }: Props) {
  return (
    <svg {...base} strokeWidth={2.2} className={`${className} animate-spin`}>
      <path d="M12 3.5a8.5 8.5 0 1 1-8.5 8.5" />
    </svg>
  );
}
