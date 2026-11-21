// Class strings every area shares, so focus rings, text links and the page frame are one
// decision instead of one per folder.

/** Keyboard-only focus ring (focus-visible keeps it off mouse clicks). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Inline text link. */
export const TEXT_LINK = `rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-dark hover:underline ${FOCUS_RING}`;

/** Page frame: the same max width and side gutters on every screen. */
export const FRAME = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

/**
 * Frame for the home page only. Its hero picture runs edge to edge, so the content beside it
 * is placed by the screen's own width (a 5% margin each side on desktop) instead of a fixed
 * centred column - otherwise a wide screen leaves a broad empty band between the text and
 * the edge of the page.
 */
export const FRAME_WIDE = 'mx-auto w-full max-w-[120rem] px-4 sm:px-6 lg:px-[5vw]';

/** Narrow frame for a single form or card (login, register, account, not found). */
export const FRAME_NARROW = 'mx-auto w-full max-w-md px-4 sm:px-6';

/**
 * A loading placeholder's surface: a soft band of light sweeping across, in the reading
 * direction (it runs the other way in Arabic). Stands still for reduced motion.
 */
export const SHIMMER =
  'bg-[linear-gradient(90deg,var(--color-background)_30%,color-mix(in_oklab,var(--color-border)_80%,white)_50%,var(--color-background)_70%)] bg-[length:300%_100%] animate-shimmer rtl:[animation-direction:reverse]';
