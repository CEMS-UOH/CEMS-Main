// Light / dark theme. The choice lives in this browser only (localStorage) - it is a display
// preference, not account data. "system" follows the device setting, live.
//
// The page must not flash the wrong theme while React loads, so app/[locale]/layout.tsx runs
// THEME_INIT_SCRIPT in <head> before anything paints; it sets <html data-theme> the same way
// resolveTheme does here. Keep the two in step.

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'scems-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system'; // storage blocked (private mode, policy): follow the device
  }
}

export function resolveTheme(preference: ThemePreference): Theme {
  if (preference !== 'system') return preference;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** Saves the choice and repaints. A short cross-fade, unless the visitor asked for less motion. */
export function applyPreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not saved, but this page still switches.
  }
  const root = document.documentElement;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm) root.classList.add('theme-switching');
  root.dataset.theme = resolveTheme(preference);
  if (!calm) window.setTimeout(() => root.classList.remove('theme-switching'), 260);
}

/** Calls back when the device setting changes (only matters while the choice is "system"). */
export function onSystemThemeChange(callback: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', callback);
  return () => query.removeEventListener('change', callback);
}

/** Runs in <head> before first paint. Plain ES5, no imports: it is inlined as a string. */
export const THEME_INIT_SCRIPT = `(function(){var t='light';try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');t=p==='dark'||p==='light'?p:(window.matchMedia('${DARK_QUERY}').matches?'dark':'light')}catch(e){}document.documentElement.setAttribute('data-theme',t)})();`;
