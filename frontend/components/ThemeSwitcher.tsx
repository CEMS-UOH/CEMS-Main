'use client';

// Header button that cycles the theme: follow the device -> light -> dark -> follow the device.
// The icon shows the current choice; the label says the current choice and what a click does.
// Sits beside LocaleSwitcher in every header, with the same ghost-button size.
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { applyPreference, onSystemThemeChange, readPreference, type ThemePreference } from '@/lib/theme';
import { MonitorIcon, MoonIcon, SunIcon } from './Icons';
import { FOCUS_RING } from './styles';

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' };
const ICON = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };

export default function ThemeSwitcher() {
  const t = useTranslations('Theme');
  // Unknown until mounted (the server cannot read localStorage); the button renders as
  // "system" until then, which is also what most visitors have.
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => setPreference(readPreference()), []);

  // While following the device, follow it live (e.g. the phone switches to dark at sunset).
  useEffect(() => {
    if (preference !== 'system') return;
    return onSystemThemeChange(() => applyPreference('system'));
  }, [preference]);

  function onClick() {
    const next = NEXT[preference];
    setPreference(next);
    applyPreference(next);
  }

  const Icon = ICON[preference];
  const label = t('label', { current: t(preference), next: t(NEXT[preference]) });

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-primary transition-colors duration-150 hover:bg-primary-light hover:text-primary-dark active:scale-[0.96] ${FOCUS_RING}`}
    >
      {/* A fresh key replays the pop, so the change is felt. */}
      <span key={preference} className="animate-pop">
        <Icon className="size-[1.125rem]" />
      </span>
    </button>
  );
}
