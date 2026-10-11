// One keyboard-focus treatment for every interactive element in the dashboards, in the
// primary token. `focus-visible` keeps it off mouse clicks and on for keyboard users.
export const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Inline text link, same look as the links on the login / account pages, plus the focus ring. */
export const TEXT_LINK = `rounded-sm font-medium text-primary hover:underline ${FOCUS_RING}`;
