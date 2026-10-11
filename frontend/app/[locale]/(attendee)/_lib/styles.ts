// Class strings shared by the attendee screens, so focus and link styling never drift between
// pages. Same look as the organizer/admin dashboards (feature/dashboards-organizer-admin-ui);
// worth moving to frontend/components once both areas are merged.

/** Keyboard-only focus ring (focus-visible keeps it off mouse clicks). */
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Inline text link, same look as the links on the login / account pages. */
export const TEXT_LINK = `rounded-sm font-medium text-primary hover:underline ${FOCUS_RING}`;

/** Native inputs and selects, matching FormField from frontend/components. */
export const INPUT =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-start text-sm text-text outline-none transition-colors duration-150 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-text-muted';

/** Page frame: same max width and gutters on every attendee screen. */
export const FRAME = 'mx-auto w-full max-w-6xl px-4 sm:px-6';
