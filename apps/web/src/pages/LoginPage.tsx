import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { PasswordField } from '../components/ui/PasswordField';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/home';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [persist, setPersist] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(identifier.trim(), password, persist);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Invalid handle/email or password.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Couldn’t sign in. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      backTo="/"
      backLabel="Home"
      kicker="Sign in"
      title="Welcome back"
      subtitle="Clients: your handle is enough. Providers: sign in with your email."
      actions={
        <Button type="submit" form="login-form" loading={submitting} disabled={!identifier.trim() || !password}>
          Sign in
        </Button>
      }
      footer={
        <p className="text-center text-[14px] text-mist">
          New here?{' '}
          <Link to="/register" className="text-cream underline decoration-line underline-offset-4 hover:decoration-brass">
            Create an account
          </Link>
        </p>
      }
    >
      <form id="login-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error ? <Notice tone="danger">{error}</Notice> : null}

        <FieldGroup>
          <Field
            label="Handle or email"
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="quietoak42 or you@example.com"
          />
          <PasswordField
            label="Password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldGroup>

        <label className="flex items-start gap-3 rounded-[1.25rem] border border-line/80 bg-ink/25 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 size-4 shrink-0 rounded border-line bg-ink-2 accent-brass"
            checked={persist}
            onChange={(e) => setPersist(e.target.checked)}
          />
          <span>
            <span className="block text-[14px] text-cream">Stay signed in on this device</span>
            <span className="mt-0.5 block text-[12px] text-mist">Leave this off on a shared phone.</span>
          </span>
        </label>
      </form>
    </AuthLayout>
  );
}
