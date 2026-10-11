// Shared button. Shapes follow the reference dashboard style the team picked
// (solid rounded-lg, soft shadow on primary) recolored to the SCEMS palette.
// Logical classes only (no ms-/me- needed here - it's an inline element).
//
// Pass `href` to get the same look on a real link (next-intl's Link, so the current language
// is kept): it can be opened in a new tab or middle-clicked. Use that for navigation and a
// plain button for actions. Without `href` this is an ordinary <button>.

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Link } from '@/i18n/navigation';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type StyleProps = {
  variant?: Variant;
  size?: Size;
};

type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type LinkProps = StyleProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

type Props = ButtonProps | LinkProps;

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

// Keyboard focus only (focus-visible), so a mouse click does not leave a ring behind.
const focusClasses =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export default function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${focusClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (props.href !== undefined) {
    return <Link className={classes} {...props} />;
  }

  return <button className={classes} {...props} />;
}
