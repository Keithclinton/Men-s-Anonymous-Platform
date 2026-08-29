import { Link } from 'react-router-dom';
import { Atmosphere } from '../components/layout/Atmosphere';
import { Chrome } from '../components/layout/Chrome';
import { LangToggle } from '../components/layout/LangToggle';
import { Panel } from '../components/layout/Panel';
import { ButtonLink } from '../components/ui/Button';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { useLocale } from '../lib/i18n';

export function WelcomePage() {
  const { t } = useLocale();
  return (
    <div className="relative min-h-dvh">
      <Atmosphere />
      <Chrome
        trailing={
          <div className="flex items-center gap-2">
            <LangToggle />
            <Link
              to="/login"
              className="inline-flex min-h-10 items-center rounded-full px-3 text-[14px] text-mist transition hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
            >
              Sign in
            </Link>
          </div>
        }
      />
      <CrisisBanner compact />

      <div className="relative xl:grid xl:min-h-[calc(100dvh-6rem)] xl:grid-cols-2">
        <main
          id="main-content"
          className="flex min-h-[calc(100dvh-4.25rem)] flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 xl:justify-end xl:px-16 xl:pb-16 xl:pt-10"
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">
            Anonymous support for men
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-[clamp(2rem,9vw,3.4rem)] leading-[1.08] tracking-tight text-cream">
            A private space. Your name stays yours.
          </h1>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-6 text-mist sm:text-[16px] sm:leading-7">
            Counseling, coaching, and support without walking in as yourself. You show up as a handle.
          </p>
          <Principles className="mt-8 hidden xl:block" />

          <div className="flex-1" />

          <Panel className="mt-8 p-4 sm:p-5 xl:hidden">
            <ButtonLink to="/register">Create a handle</ButtonLink>
            <p className="mt-4 text-center text-[14px] text-mist">
              Already here?{' '}
              <Link to="/login" className="text-cream underline decoration-line underline-offset-4">
                Sign in
              </Link>
            </p>
          </Panel>
        </main>

        <div className="hidden xl:flex xl:items-center xl:justify-center xl:p-10">
          <Panel className="w-full max-w-[420px] p-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">Begin</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight text-cream">Create a handle</h2>
            <p className="mt-2 text-[14px] leading-6 text-mist">
              No real name. Counselors see this handle only — including on video.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <ButtonLink to="/register">Create a handle</ButtonLink>
              <ButtonLink to="/login" variant="secondary">
                I already have an account
              </ButtonLink>
            </div>
          </Panel>
        </div>
      </div>

      <nav className="relative flex flex-wrap justify-center gap-x-4 gap-y-2 px-5 py-6 text-[13px] text-mist">
        <Link to="/how-it-works">{t.how}</Link>
        <Link to="/faq">{t.faq}</Link>
        <Link to="/for-providers">{t.forProviders}</Link>
        <Link to="/terms">{t.terms}</Link>
        <Link to="/privacy">{t.privacy}</Link>
      </nav>
    </div>
  );
}

function Principles({ className }: { className?: string }) {
  return (
    <ul className={className}>
      <li className="flex gap-3 border-t border-line/80 py-3 text-[13px] leading-5 text-mist">
        <span className="font-display text-brass">01</span>
        Handle only. No legal name on this screen.
      </li>
      <li className="flex gap-3 border-t border-line/80 py-3 text-[13px] leading-5 text-mist">
        <span className="font-display text-brass">02</span>
        Recovery contact is optional, and vaulted.
      </li>
      <li className="flex gap-3 border-t border-b border-line/80 py-3 text-[13px] leading-5 text-mist">
        <span className="font-display text-brass">03</span>
        Video is allowed while you stay anonymous.
      </li>
    </ul>
  );
}
