'use client';

// The top of every signed-in area: brand, the tools on the far side (language, account,
// log out), and the area's sections as underlined tabs. Shared by the attendee area and both
// dashboards so the three never drift apart.
//
// The underline is one element that slides to the active tab when the page changes, so the
// eye follows where you went instead of seeing one line vanish and another appear.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
  const navRef = useRef<HTMLElement>(null);
  const [bar, setBar] = useState<{ x: number; width: number; animate: boolean } | null>(null);
  const activeHref = nav.find((item) => item.active)?.href ?? null;

  useLayoutEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;
    const measure = (animate: boolean) => {
      const link = navEl.querySelector<HTMLElement>('[aria-current="page"]');
      if (!link) return setBar(null);
      setBar((previous) => ({
        x: link.offsetLeft,
        width: link.offsetWidth,
        // No slide on the first paint or after a resize - only when the tab changes.
        animate: animate && previous !== null,
      }));
      // Keep the active tab in view when the row scrolls sideways on a phone.
      link.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    measure(true);
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(navEl);
    return () => observer.disconnect();
  }, [activeHref]);

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
        ref={navRef}
        aria-label={navLabel}
        className={`${FRAME} relative flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={`group relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              item.active ? 'text-primary' : 'text-text-muted hover:text-text'
            }`}
          >
            {item.icon}
            {item.label}
            {/* Hover hint on the other tabs: a faint line where the active one would sit. */}
            {!item.active ? (
              <span
                aria-hidden
                className="absolute inset-x-3 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-border transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
              />
            ) : null}
          </Link>
        ))}
        {bar ? (
          <span
            aria-hidden
            className={`pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary ${
              bar.animate ? 'transition-[transform,width] duration-300 ease-[var(--ease-out-expo)]' : ''
            }`}
            // Physical left on purpose (not a logical start-): offsetLeft is measured from the
            // left edge in both directions, so the bar is placed in the same coordinates.
            style={{ left: 0, width: bar.width, transform: `translateX(${bar.x}px)` }}
          />
        ) : null}
      </nav>
    </header>
  );
}
