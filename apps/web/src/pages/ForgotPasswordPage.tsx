import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth';
import { ApiError, isUnimplemented } from '../api/errors';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { CrisisBanner } from '../components/safety/CrisisBanner';

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(identifier);
      setDone(true);
    } catch (err) {
      if (isUnimplemented(err)) {
        setDone(true);
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Couldn’t send a reset.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      backTo="/login"
      backLabel="Sign in"
      kicker="Account"
      title="Reset password"
      subtitle="Use the handle or the vault email. We never say whether an account exists."
      actions={
        done ? null : (
          <Button type="submit" form="forgot-form" loading={submitting} disabled={!identifier.trim()}>
            Send reset link
          </Button>
        )
      }
      footer={
        <p className="text-center text-[14px] text-mist">
          <Link to="/login" className="text-cream underline decoration-line underline-offset-4">
            Back to sign in
          </Link>
        </p>
      }
    >
      <div className="mb-4">
        <CrisisBanner compact />
      </div>
      <form id="forgot-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {done ? (
          <Notice>
            If that handle or email is on file, a reset link will arrive. The live API may not send mail yet — if nothing
            comes, wait for backend <code className="text-cream">POST /auth/forgot-password</code>.
          </Notice>
        ) : (
          <FieldGroup>
            <Field
              label="Handle or email"
              name="identifier"
              autoComplete="username"
              autoCapitalize="none"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </FieldGroup>
        )}
      </form>
    </AuthLayout>
  );
}
