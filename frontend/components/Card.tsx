// Shared surface card: white, rounded-lg, soft layered shadow - the reference
// dashboard's card look, recolored to the SCEMS palette. For dashboards
// (organizer/admin, Role 5) and attendee listing cards (Role 4) alike.

import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export default function Card({ padded = true, className = '', ...props }: Props) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface shadow-[var(--shadow-card)] ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    />
  );
}
