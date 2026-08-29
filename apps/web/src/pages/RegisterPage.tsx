import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/errors';
import { useAuth } from '../auth/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { PasswordField } from '../components/ui/PasswordField';
import { Segmented } from '../components/ui/Segmented';
import { StepRail } from '../components/ui/StepRail';
import { CrisisBanner } from '../components/safety/CrisisBanner';
import { suggestHandle } from '../lib/handles';
import {
  emailError,
  normalizePhone,
  passwordError,
  phoneError,
  usernameError,
} from '../lib/validation';

type Role = 'CLIENT' | 'PROVIDER';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>('CLIENT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isProvider = role === 'PROVIDER';

  const usernameErr = usernameError(username);
  // Optional for providers — only validated (format/length) if they actually typed one.
  const providerHandleErr = isProvider ? (username.trim() ? usernameError(username) : null) : null;
  const passwordErr = passwordError(password);
  const confirmErr = confirm !== password ? 'Passwords don’t match.' : null;
  const emailErr = emailError(email);
  const phoneErr = phoneError(phone);

  const step1Valid = isProvider
    ? !emailErr &&
      email.trim().length > 0 &&
      !providerHandleErr &&
      !passwordErr &&
      !confirmErr &&
      confirm.length > 0
    : !usernameErr && !passwordErr && !confirmErr && confirm.length > 0;

  function markTouched(...keys: string[]) {
    setTouched((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = true;
      return next;
    });
  }

  function goNext() {
    markTouched('username', 'password', 'confirm');
    if (!step1Valid) return;
    if (!ageOk || !termsOk) {
      setError('Confirm you are 18+ and accept the terms.');
      return;
    }
    setError(null);
    setStep(2);
  }

  async function createAccount(includeRecovery: boolean) {
    if (isProvider) {
      markTouched('email', 'password', 'confirm');
    }
    if (!step1Valid) {
      setStep(1);
      return;
    }
    if (!ageOk || !termsOk) {
      setError('Confirm you are 18+ and accept the terms.');
      return;
    }
    if (!isProvider && includeRecovery) {
      markTouched('email', 'phone');
      if (emailErr || phoneErr) return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await signUp({
        username: isProvider ? username.trim() || undefined : username.trim(),
        password,
        role,
        email: isProvider
          ? email.trim()
          : includeRecovery && email.trim()
            ? email.trim()
            : undefined,
        phone: !isProvider && includeRecovery && phone.trim() ? normalizePhone(phone) : undefined,
        persist: false,
      });
      navigate(role === 'CLIENT' ? '/intake' : '/home', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        setStep(1);
        setError(isProvider ? err.message : 'That handle is taken. Try another.');
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Couldn’t create the account. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      if (isProvider) {
        await createAccount(false);
      } else {
        goNext();
      }
      return;
    }
    await createAccount(true);
  }

  return (
    <AuthLayout
      backTo="/"
      backLabel="Home"
      kicker={step === 1 ? 'Join' : 'Optional'}
      title={step === 1 ? (isProvider ? 'Create your provider account' : 'Create your handle') : 'Recovery, if you want it'}
      subtitle={
        step === 1
          ? isProvider
            ? 'Providers aren’t anonymous — clients and admins can verify you by this email.'
            : 'This is the only name anyone here will see.'
          : 'Skip to stay handle-only. Contact lives in a separate vault — counselors never see it.'
      }
      actions={
        step === 1 ? (
          isProvider ? (
            <Button type="submit" form="register-form" loading={submitting}>
              Create account
            </Button>
          ) : (
            <Button type="submit" form="register-form">
              Continue
            </Button>
          )
        ) : (
          <>
            <Button type="submit" form="register-form" loading={submitting} disabled={role === 'PROVIDER' && !email.trim()}>
              Create account
            </Button>
            {role === 'CLIENT' ? (
              <Button variant="secondary" loading={submitting} onClick={() => void createAccount(false)}>
                Skip — stay handle-only
              </Button>
            ) : null}
          </>
        )
      }
      footer={
        step === 1 ? (
          <p className="text-center text-[14px] text-mist">
            Already have an account?{' '}
            <Link to="/login" className="text-cream underline decoration-line underline-offset-4 hover:decoration-brass">
              Sign in
            </Link>
          </p>
        ) : (
          <button
            type="button"
            className="mx-auto block min-h-11 text-[14px] text-mist hover:text-cream"
            onClick={() => {
              setError(null);
              setStep(1);
            }}
          >
            ← Back to handle
          </button>
        )
      }
    >
      <form id="register-form" onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {isProvider ? null : <StepRail step={step} steps={['Handle', 'Recovery']} />}
        <CrisisBanner compact />
        {error ? <Notice tone="danger">{error}</Notice> : null}

        {step === 1 ? (
          <>
            <Segmented
              legend="I’m here to"
              value={role}
              onChange={setRole}
              options={[
                { value: 'CLIENT', label: 'Get support', hint: 'Stay anonymous' },
                { value: 'PROVIDER', label: 'Provide support', hint: 'Verified later' },
              ]}
            />

            <FieldGroup>
              {isProvider ? (
                <>
                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => markTouched('email')}
                    placeholder="you@example.com"
                    error={touched.email ? emailErr : null}
                  />
                  <Field
                    label="Handle"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => markTouched('username')}
                    placeholder="Optional — for your admin/internal record"
                    hint="You still always sign in with email above. This is just how you're shown internally."
                    error={touched.username ? providerHandleErr : null}
                  />
                </>
              ) : (
                <Field
                  label="Handle"
                  name="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onBlur={() => markTouched('username')}
                  placeholder="quietoak42"
                  error={touched.username ? usernameErr : null}
                  trailing={
                    <button
                      type="button"
                      className="text-[12px] font-medium uppercase tracking-[0.12em] text-brass hover:text-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
                      onClick={() => {
                        setUsername(suggestHandle());
                        markTouched('username');
                      }}
                    >
                      Suggest
                    </button>
                  }
                />
              )}
              <PasswordField
                label="Password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => markTouched('password')}
                error={touched.password ? passwordErr : null}
                hint={touched.password ? undefined : 'At least 10 characters'}
              />
              <PasswordField
                label="Confirm"
                name="confirmPassword"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onBlur={() => markTouched('confirm')}
                error={touched.confirm ? confirmErr : null}
              />
            </FieldGroup>
            <label className="flex items-start gap-3 text-[13px] leading-5 text-mist">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-brass"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
              />
              I am 18 or older.
            </label>
            <label className="flex items-start gap-3 text-[13px] leading-5 text-mist">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-brass"
                checked={termsOk}
                onChange={(e) => setTermsOk(e.target.checked)}
              />
              <span>
                I accept the{' '}
                <Link to="/terms" className="text-cream underline decoration-line underline-offset-4">
                  terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-cream underline decoration-line underline-offset-4">
                  privacy
                </Link>{' '}
                notice. MAP is not emergency care.
              </span>
            </label>
          </>
        ) : (
          <FieldGroup>
            <Field
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => markTouched('email')}
              placeholder={role === 'PROVIDER' ? 'Required for providers' : 'Optional'}
              required={role === 'PROVIDER'}
              error={
                touched.email
                  ? role === 'PROVIDER' && !email.trim()
                    ? 'Providers need a vault email on this API.'
                    : emailErr
                  : null
              }
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => markTouched('phone')}
              placeholder="+2547XXXXXXXX"
              error={touched.phone ? phoneErr : null}
              hint="Kenyan 07… numbers convert automatically. Used later for M-Pesa."
            />
          </FieldGroup>
        )}
      </form>
    </AuthLayout>
  );
}
