// Small inline icons for the attendee screens (24px grid, stroke = currentColor).
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
