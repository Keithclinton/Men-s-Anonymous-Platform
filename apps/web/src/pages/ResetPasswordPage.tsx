import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import { ApiError, isUnimplemented } from '../api/errors';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { PasswordField } from '../components/ui/PasswordField';
import { passwordError } from '../lib/validation';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const passwordErr = passwordError(password);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (passwordErr || password !== confirm || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      if (isUnimplemented(err)) {
        setError('Reset isn’t on the API yet. Ask ops to enable POST /auth/reset-password.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Couldn’t reset.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      backTo="/login"
      title="Choose a new password"
      subtitle="Use the link from your reset email."
      actions={
        done ? null : (
          <Button
            type="submit"
            form="reset-form"
            loading={submitting}
            disabled={Boolean(passwordErr) || password !== confirm || !token}
          >
            Save password
          </Button>
        )
      }
      footer={
        <p className="text-center text-[14px] text-mist">
          <Link to="/login" className="text-cream underline decoration-line underline-offset-4">
            Sign in
          </Link>
        </p>
      }
    >
      <form id="reset-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {!token ? <Notice tone="danger">Missing reset token in the link.</Notice> : null}
        {done ? (
          <Notice>Password updated. Sign in with the new one.</Notice>
        ) : (
          <>
            <PasswordField
              label="New password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={passwordErr}
            />
            <PasswordField
              label="Confirm"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={confirm && confirm !== password ? 'Passwords don’t match.' : null}
            />
          </>
        )}
      </form>
    </AuthLayout>
  );
}
