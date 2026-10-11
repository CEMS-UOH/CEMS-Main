// Class strings every area shares, so focus rings, text links and the page frame are one
// decision instead of one per folder.

/** Keyboard-only focus ring (focus-visible keeps it off mouse clicks). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Inline text link. */
export const TEXT_LINK = `rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:text-primary-dark hover:underline ${FOCUS_RING}`;

/** Page frame: the same max width and side gutters on every screen. */
export const FRAME = 'mx-auto w-full max-w-6xl px-4 sm:px-6';

/** Narrow frame for a single form or card (login, register, account, not found). */
export const FRAME_NARROW = 'mx-auto w-full max-w-md px-4 sm:px-6';
