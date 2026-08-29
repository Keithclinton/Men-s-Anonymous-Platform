import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Atmosphere } from './Atmosphere';
import { Chrome } from './Chrome';
import { CrisisBanner } from '../safety/CrisisBanner';
import { LangToggle } from './LangToggle';
import { useLocale } from '../../lib/i18n';

export function PublicShell({
  children,
  backTo,
  title,
}: {
  children: ReactNode;
  backTo?: string;
  title: string;
}) {
  const { t } = useLocale();
  return (
    <div className="relative min-h-dvh">
      <Atmosphere />
      <Chrome
        backTo={backTo ?? '/'}
        backLabel="Home"
        trailing={<LangToggle />}
      />
      <CrisisBanner compact />
      <main id="main-content" className="relative mx-auto w-full max-w-2xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <h1 className="font-display text-[1.85rem] tracking-tight text-cream">{title}</h1>
        <div className="mt-5 space-y-4 text-[15px] leading-7 text-mist">{children}</div>
        <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-mist">
          <Link to="/how-it-works">{t.how}</Link>
          <Link to="/faq">{t.faq}</Link>
          <Link to="/for-providers">{t.forProviders}</Link>
          <Link to="/terms">{t.terms}</Link>
          <Link to="/privacy">{t.privacy}</Link>
        </nav>
      </main>
    </div>
  );
}
