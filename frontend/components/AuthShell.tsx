// Frame for the pages that stand outside any area: log in, create account, my account and
// "not found". The same white top bar as everywhere else (brand and language switch), then
// one narrow column centred on the page.

import { useTranslations } from 'next-intl';
import Brand from './Brand';
import LocaleSwitcher from './LocaleSwitcher';
import { FRAME, FRAME_NARROW } from './styles';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Home');

  return (
    <div className="flex min-h-screen flex-col">
      {/* White like the other headers: the logo file has a white background of its own. */}
      <header className="border-b border-border bg-surface">
        <div className={`${FRAME} flex items-center justify-between gap-4 py-3`}>
          <Brand name={t('title')} href="/" />
          <LocaleSwitcher />
        </div>
      </header>
      <main className={`${FRAME_NARROW} flex flex-1 flex-col justify-center gap-6 pt-10 pb-16`}>
        {children}
      </main>
    </div>
  );
}
