// Shared button. Shapes follow the reference dashboard style the team picked
// (solid rounded-lg, soft shadow on primary) recolored to the SCEMS palette.
// Logical classes only (no ms-/me- needed here - it's an inline element).
//
// Pass `href` to get the same look on a real link (next-intl's Link, so the current language
// is kept): it can be opened in a new tab or middle-clicked. Use that for navigation and a
// plain button for actions. Without `href` this is an ordinary <button>.
//
// States, the same for every variant:
//   hover     a slightly deeper colour and a 1px lift
//   pressed   settles back down and shrinks a touch, so a click is felt
//   focus     a ring in the variant's own colour, keyboard only
//   loading   pass `loading`: a spinner takes the icon's place, the button keeps its colour
//             and cannot be clicked twice
//   disabled  flat and grey - clearly "not available", not a faded copy of the live button

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { SpinnerIcon } from './Icons';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type StyleProps = {
  variant?: Variant;
  size?: Size;
  /** Icon before the label. Always use this (not a child) so the gap is the same everywhere. */
  icon?: ReactNode;
};

type ButtonProps = StyleProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
    /** The action is running: shows a spinner and blocks a second click. */
    loading?: boolean;
  };
type LinkProps = StyleProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
    href: string;
    /** Link to the same page in another language (next-intl). */
    locale?: string;
    loading?: undefined;
  };

type Props = ButtonProps | LinkProps;

// Timing: 150 ms with a confident deceleration on the way in; the press itself is quicker
// (75 ms) so a click is felt the instant it happens, not after.
const base =
  'relative inline-flex cursor-pointer select-none items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-[var(--ease-out-expo)] active:duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none [&_svg]:shrink-0';

// `not-disabled:` (rather than `enabled:`) so the same rules also reach the link form,
// which has no disabled state of its own.
const lift =
  'not-disabled:hover:-translate-y-px not-disabled:active:translate-y-0 not-disabled:active:scale-[0.97]';

const variantClasses: Record<Variant, string> = {
  // A hairline of light along the top edge gives the filled buttons a made, physical feel.
  primary: `bg-primary text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--shadow-card)] focus-visible:outline-primary not-disabled:hover:bg-primary-dark not-disabled:hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.1),var(--shadow-card-hover)] not-disabled:active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.2)] ${lift}`,
  secondary: `border border-primary/30 bg-surface text-primary shadow-[0_1px_2px_rgb(16_24_21/0.04)] focus-visible:outline-primary not-disabled:hover:border-primary/60 not-disabled:hover:bg-primary-light not-disabled:hover:text-primary-dark not-disabled:active:bg-primary-light not-disabled:active:shadow-none ${lift}`,
  ghost:
    'bg-transparent text-primary focus-visible:outline-primary not-disabled:hover:bg-primary-light not-disabled:hover:text-primary-dark not-disabled:active:scale-[0.98] not-disabled:active:bg-primary-light',
  danger: `bg-danger text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),var(--shadow-card)] focus-visible:outline-danger not-disabled:hover:brightness-90 not-disabled:hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.1),var(--shadow-card-hover)] not-disabled:active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.2)] ${lift}`,
};

const disabledClasses: Record<Variant, string> = {
  primary: 'disabled:bg-border disabled:text-text-muted disabled:shadow-none',
  secondary: 'disabled:border-border disabled:bg-background disabled:text-text-muted',
  ghost: 'disabled:text-text-muted',
  danger: 'disabled:bg-border disabled:text-text-muted disabled:shadow-none',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...props
}: Props) {
  const shared = `${base} ${variantClasses[variant]} ${sizeClasses[size]}`;

  if (props.href !== undefined) {
    return (
      <Link className={`${shared} ${className}`} {...props}>
        {icon}
        {children}
      </Link>
    );
  }

  const { loading = false, disabled, ...buttonProps } = props;
  // While loading the button stays in its own colour (it is working, not unavailable), so the
  // grey disabled look is only applied to a button that is disabled for another reason.
  const state = loading
    ? 'cursor-progress'
    : `disabled:cursor-not-allowed ${disabledClasses[variant]}`;

  return (
    <button
      className={`${shared} ${state} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {loading ? <SpinnerIcon /> : icon}
      {children}
    </button>
  );
}
