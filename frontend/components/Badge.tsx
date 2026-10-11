// Pill-shaped status chip - rounded-full is reserved for these; everything else uses the
// standard rounded-lg. The label always carries the meaning; colour only reinforces it.
//
// `accent` (gold) exists for the one thing on a screen that needs attention soon, such as
// "3 seats left". It is not a decoration: at most one gold element per screen.

import type { ReactNode } from 'react';

export type BadgeTone = 'primary' | 'success' | 'danger' | 'accent' | 'neutral' | 'muted';

const toneClasses: Record<BadgeTone, string> = {
  primary: 'bg-primary-light text-primary-dark',
  success: 'bg-success-light text-success',
  danger: 'bg-danger-light text-danger',
  accent: 'bg-accent-light text-accent-dark',
  neutral: 'border border-border bg-surface text-text',
  muted: 'bg-background text-text-muted',
};

type Props = {
  tone: BadgeTone;
  /** Small icon before the label. */
  icon?: ReactNode;
  children: ReactNode;
};

export default function Badge({ tone, icon, children }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
