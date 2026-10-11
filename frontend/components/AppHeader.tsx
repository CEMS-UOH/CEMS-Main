// The top of every signed-in area: brand, the tools on the far side (language, account,
// log out), and the area's sections as underlined tabs. Shared by the attendee area and both
// dashboards so the three never drift apart.

import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import Brand from './Brand';
import HeaderBar from './HeaderBar';
import { FOCUS_RING, FRAME } from './styles';

export type HeaderNavItem = {
  href: string;
  label: string;
  active: boolean;
  icon?: ReactNode;
};

type Props = {
  productName: string;
  /** Where the brand links to: the area's own start page. */
  homeHref: string;
  /** Small chip after the brand, e.g. the role of the dashboard. */
  badge?: ReactNode;
  /** Right-hand side (left in Arabic): language switch, account, log out. */
  tools: ReactNode;
  nav: HeaderNavItem[];
  navLabel: string;
  /** Id of the <main> element the skip link jumps to. */
  mainId: string;
  skipLabel: string;
};

export default function AppHeader({
  productName,
  homeHref,
  badge,
  tools,
  nav,
  navLabel,
  mainId,
  skipLabel,
}: Props) {
  return (
    <header className="border-b border-border bg-surface">
      <a
        href={`#${mainId}`}
        className={`sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-20 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow-[var(--shadow-card)] ${FOCUS_RING}`}
      >
        {skipLabel}
      </a>

      <HeaderBar
        start={
          <>
            <Brand name={productName} href={homeHref} compact={Boolean(badge)} />
            {badge}
          </>
        }
        tools={tools}
      />

      {/* Scrolls sideways inside itself on narrow screens - the page never does. The scrollbar
          is hidden; the tabs themselves show there is more. */}
      <nav
        aria-label={navLabel}
        className={`${FRAME} flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              item.active
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:border-border hover:text-text'
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
