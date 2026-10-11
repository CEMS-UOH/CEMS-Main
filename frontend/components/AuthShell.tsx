// Frame for the pages that stand outside any area: log in, create account, my account and
// "not found". The same white top bar as everywhere else (brand and language switch), then
// one narrow column centred on the page.

import { useTranslations } from 'next-intl';
import Brand from './Brand';
import HeaderBar from './HeaderBar';
import LocaleSwitcher from './LocaleSwitcher';
import { FRAME_NARROW } from './styles';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Home');

  return (
    <div className="flex min-h-screen flex-col">
      {/* White like the other headers: the logo file has a white background of its own. */}
      <header className="border-b border-border bg-surface">
        <HeaderBar start={<Brand name={t('title')} href="/" />} tools={<LocaleSwitcher />} />
      </header>
      <main className={`${FRAME_NARROW} flex flex-1 flex-col justify-center gap-6 pt-10 pb-16`}>
        {children}
      </main>
    </div>
  );
}
