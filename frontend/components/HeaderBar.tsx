// The top row of every header - home, sign-in pages, attendee area, dashboards - so the
// spacing is decided once: one row height, one gap beside the brand, one gap between the
// controls, everything centred on the same line.

import type { ReactNode } from 'react';
import { FRAME } from './styles';

type Props = {
  /** Page frame the row sits in. The home page passes its wider one. */
  frame?: string;
  /** Brand, plus anything that belongs right beside it (a role chip). */
  start: ReactNode;
  /** Language switch, account, log out. */
  tools: ReactNode;
};

export default function HeaderBar({ frame = FRAME, start, tools }: Props) {
  return (
    // One row on every real phone. Only below 340px - narrower than any current phone - does
    // it fall onto two rows rather than overlap.
    <div
      className={`${frame} flex min-h-16 items-center justify-between gap-x-2 gap-y-2 py-2 max-[339px]:flex-wrap sm:gap-x-4`}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">{start}</div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">{tools}</div>
    </div>
  );
}
