import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ButtonLink } from '../components/ui/Button';
import { staffRoleLabel } from '../lib/format';

export function HomePage() {
  const { user } = useAuth();
  if (!user) return null;

  const isProvider = user.role === 'PROVIDER';
  const identifier = isProvider && user.email ? user.email : user.username;
  const roleLabel =
    user.role === 'PROVIDER'
      ? user.providerProfile?.kind === 'MODERATOR'
        ? 'Moderator'
        : 'Counselor'
      : user.role === 'ADMIN'
        ? staffRoleLabel(user.staffRole)
        : 'Client';

  return (
    <AppShell>
      <Panel className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-sage">You’re in</p>
            <h1 className="mt-2 break-all font-display text-[clamp(1.75rem,7vw,2.15rem)] leading-tight tracking-tight text-cream">
              {identifier}
            </h1>
          </div>
          <span className="shrink-0 rounded-full border border-line bg-ink/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-mist">
            {roleLabel}
          </span>
        </div>
        <p className="mt-3 text-[14px] leading-6 text-mist">
          {isProvider
            ? 'Clients and admins can verify you by this email — providers aren’t anonymous.'
            : 'This handle is what others see. Reveal is optional and scoped — never a public dump.'}
        </p>
      </Panel>

      {user.role === 'CLIENT' ? (
        <Panel className="mt-3 flex flex-col gap-3 p-5">
          <ButtonLink to="/providers">Find a provider</ButtonLink>
          <ButtonLink to="/match" variant="secondary">
            Auto-match me
          </ButtonLink>
          <ButtonLink to="/bookings" variant="ghost">
            Your sessions
          </ButtonLink>
          <ButtonLink to="/profile" variant="ghost">
            Your profile
          </ButtonLink>
          <ButtonLink to="/plans" variant="ghost">
            Session plans
          </ButtonLink>
        </Panel>
      ) : null}

      {user.role === 'PROVIDER' ? (
        <Panel className="mt-3 flex flex-col gap-3 p-5">
          <ButtonLink to="/provider">Open provider desk</ButtonLink>
          <ButtonLink to="/bookings" variant="secondary">
            Requests & sessions
          </ButtonLink>
        </Panel>
      ) : null}

      {user.role === 'ADMIN' ? (
        <Panel className="mt-3 flex flex-col gap-3 p-5">
          <ButtonLink to="/admin">Open admin</ButtonLink>
          <ButtonLink to="/library" variant="secondary">
            Content library
          </ButtonLink>
        </Panel>
      ) : null}
    </AppShell>
  );
}
