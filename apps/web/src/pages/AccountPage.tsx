import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { ApiError, isUnimplemented } from '../api/errors';
import { deleteMe, updateMe } from '../api/users';
import { tokenStore } from '../auth/tokens';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { PasswordField } from '../components/ui/PasswordField';
import { useLocale } from '../lib/i18n';
import { publicHandle } from '../lib/format';
import { emailError, normalizePhone, passwordError, phoneError } from '../lib/validation';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [persist, setPersist] = useState(() => tokenStore.isPersistent());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nextErr = passwordError(next);
  const emailErr = emailError(email);
  const phoneErr = phoneError(phone);

  if (!user) return null;

  async function onPassword(event: FormEvent) {
    event.preventDefault();
    if (nextErr || !current) return;
    setSaving(true);
    setError(null);
    try {
      await changePassword(current, next);
      setNotice('Password updated.');
      setCurrent('');
      setNext('');
    } catch (err) {
      setError(
        isUnimplemented(err)
          ? 'Change-password isn’t on the API yet (POST /auth/change-password).'
          : err instanceof ApiError
            ? err.message
            : 'Couldn’t update password.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('Anonymize this account on this device and ask the API to delete it?')) return;
    try {
      await deleteMe();
    } catch (err) {
      if (!isUnimplemented(err)) {
        setError(err instanceof ApiError ? err.message : 'Couldn’t delete.');
        return;
      }
    }
    signOut();
  }

  return (
    <AppShell title={t.account} subtitle="Handle, language, password, and leaving MAP.">
      <div className="flex flex-col gap-3">
        <CrisisBanner />
        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-sage">Handle</p>
          <p className="mt-2 font-display text-2xl text-cream">
            {user.providerProfile?.displayName || publicHandle(user.username, user.role)}
          </p>
          <p className="mt-1 break-all text-[12px] text-mist">{user.username}</p>
        </Panel>

        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Stay signed in</p>
          <label className="mt-3 flex items-start gap-3 text-[13px] leading-5 text-mist">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-brass"
              checked={persist}
              onChange={(e) => {
                const on = e.target.checked;
                setPersist(on);
                tokenStore.setPersist(on);
              }}
            />
            Keep me signed in on this device. Off is safer on a shared phone — closing the tab signs you out.
          </label>
        </Panel>

        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Recovery contact</p>
          <p className="mt-2 text-[13px] leading-5 text-mist">
            Optional. Vaulted — counselors never see this. Used for password reset and M-Pesa later.
          </p>
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              if (emailErr || phoneErr) return;
              setSaving(true);
              setError(null);
              void updateMe({
                email: email.trim() || undefined,
                phone: phone.trim() ? normalizePhone(phone) : undefined,
              })
                .then(() => {
                  setNotice('Recovery contact saved.');
                  setEmail('');
                  setPhone('');
                })
                .catch((err) =>
                  setError(
                    isUnimplemented(err)
                      ? 'Updating recovery contact needs PATCH /users/me on the API.'
                      : err instanceof ApiError
                        ? err.message
                        : 'Couldn’t save.',
                  ),
                )
                .finally(() => setSaving(false));
            }}
          >
            <FieldGroup>
              <Field
                label="Email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={email ? emailErr : null}
                placeholder="Optional"
              />
              <Field
                label="Phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={phone ? phoneErr : null}
                placeholder="+2547…"
              />
            </FieldGroup>
            <Button type="submit" loading={saving} disabled={Boolean(emailErr || phoneErr) || (!email.trim() && !phone.trim())}>
              Save recovery
            </Button>
          </form>
        </Panel>

        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Language</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant={locale === 'en' ? 'primary' : 'secondary'} onClick={() => setLocale('en')}>
              English
            </Button>
            <Button variant={locale === 'sw' ? 'primary' : 'secondary'} onClick={() => setLocale('sw')}>
              Kiswahili
            </Button>
          </div>
        </Panel>

        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Password</p>
          {error ? (
            <div className="mt-3">
              <Notice tone="danger">{error}</Notice>
            </div>
          ) : null}
          {notice ? (
            <div className="mt-3">
              <Notice>{notice}</Notice>
            </div>
          ) : null}
          <form onSubmit={onPassword} className="mt-3 flex flex-col gap-3">
            <PasswordField
              label="Current"
              name="current"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
            <PasswordField
              label="New"
              name="next"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              error={next ? nextErr : null}
            />
            <Button type="submit" loading={saving} disabled={Boolean(nextErr) || !current || !next}>
              Update password
            </Button>
          </form>
        </Panel>

        <Panel className="p-5">
          <p className="text-[13px] text-mist">
            <Link to="/terms" className="text-cream underline decoration-line underline-offset-4">
              Terms
            </Link>
            {' · '}
            <Link to="/privacy" className="text-cream underline decoration-line underline-offset-4">
              Privacy
            </Link>
          </p>
          <Button variant="danger" className="mt-4" onClick={() => void onDelete()}>
            Delete / anonymize
          </Button>
          <Button variant="secondary" className="mt-2" onClick={signOut}>
            {t.signOut}
          </Button>
        </Panel>
      </div>
    </AppShell>
  );
}
