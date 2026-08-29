import type { ReactNode } from 'react';
import { Atmosphere } from './Atmosphere';
import { Chrome } from './Chrome';
import { Panel } from './Panel';

function DefaultAside() {
  return (
    <div className="relative max-w-lg">
      <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-sage">Anonymous support</p>
      <h2 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-cream">
        A private space.
        <br />
        Your name stays yours.
      </h2>
      <ul className="mt-12 space-y-5 text-[15px] leading-6 text-mist">
        <AsideItem index="01" text="You enter as a handle. Counselors never see a legal name unless you reveal it." />
        <AsideItem index="02" text="Email and phone, if you add them, live in a separate vault — not in session data." />
        <AsideItem index="03" text="Video is allowed while you stay anonymous. A live face is not a reveal." />
      </ul>
    </div>
  );
}

function AsideItem({ index, text }: { index: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span className="font-display text-[13px] text-brass">{index}</span>
      <span>{text}</span>
    </li>
  );
}

export function AuthLayout({
  backTo,
  backLabel,
  kicker,
  title,
  subtitle,
  aside,
  children,
  actions,
  footer,
}: {
  backTo?: string;
  backLabel?: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-dvh">
      <Atmosphere />
      <Chrome backTo={backTo} backLabel={backLabel} />

      <div className="relative xl:grid xl:min-h-[calc(100dvh-4.25rem)] xl:grid-cols-2">
        <aside className="hidden xl:flex xl:flex-col xl:justify-end xl:px-16 xl:pb-16 xl:pt-10">
          {aside ?? <DefaultAside />}
        </aside>

        <main
          id="main-content"
          className="px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 xl:flex xl:items-center xl:justify-center xl:px-10 xl:py-10"
        >
          <div className="mx-auto w-full max-w-md">
            {kicker ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">{kicker}</p>
            ) : null}
            <h1 className="mt-2 font-display text-[clamp(1.7rem,7vw,2.05rem)] leading-[1.15] tracking-tight text-cream">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-[42ch] text-[14px] leading-6 text-mist">{subtitle}</p>
            ) : null}

            <Panel className="mt-5 p-4 sm:p-6">
              {children}
              {actions ? <div className="mt-5 flex flex-col gap-2.5">{actions}</div> : null}
              {footer ? <div className="mt-4">{footer}</div> : null}
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}
