// Shared surface card: white, rounded-lg, soft layered shadow - the reference
// dashboard's card look, recolored to the SCEMS palette. For dashboards
// (organizer/admin, Role 5) and attendee listing cards (Role 4) alike.
//
// Every raised surface in the app comes from here, so radius, border and shadow are one
// decision. A card that is itself a link (the attendee event card) cannot be a <div>; it
// calls cardClasses() to get exactly the same surface.

import type { HTMLAttributes } from 'react';

type Options = {
  padded?: boolean;
  /** The whole card is clickable: it lifts a little on hover. */
  interactive?: boolean;
};

export function cardClasses({ padded = true, interactive = false }: Options = {}) {
  return [
    'rounded-lg border border-border bg-surface shadow-[var(--shadow-card)]',
    padded ? 'p-5 sm:p-6' : '',
    interactive
      ? 'transition-[box-shadow,transform,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[var(--shadow-card-hover)] motion-reduce:transform-none motion-reduce:transition-none'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

type Props = HTMLAttributes<HTMLDivElement> & Options;

export default function Card({ padded, interactive, className = '', ...props }: Props) {
  return <div className={`${cardClasses({ padded, interactive })} ${className}`} {...props} />;
}
