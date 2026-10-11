// Shared button. Shapes follow the reference dashboard style the team picked
// (solid rounded-lg, soft shadow on primary) recolored to the SCEMS palette.
// Logical classes only (no ms-/me- needed here - it's an inline element).

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary text-white shadow-[var(--shadow-card)] hover:bg-primary-dark disabled:hover:bg-primary',
  secondary:
    'bg-surface text-primary border border-primary/30 hover:bg-primary-light disabled:hover:bg-surface',
  ghost: 'bg-transparent text-primary hover:bg-primary-light',
  danger:
    'bg-danger text-white shadow-[var(--shadow-card)] hover:opacity-90 disabled:hover:opacity-100',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: Props) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
