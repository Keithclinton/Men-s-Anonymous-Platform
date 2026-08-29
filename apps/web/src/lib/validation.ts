const USERNAME_RE = /^[a-zA-Z0-9_]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function usernameError(value: string): string | null {
  const username = value.trim();
  if (username.length < 3) return 'Use at least 3 characters.';
  if (!USERNAME_RE.test(username)) return 'Letters, numbers, and underscores only.';
  return null;
}

export function passwordError(value: string): string | null {
  if (value.length < 10) return 'Use at least 10 characters.';
  return null;
}

export function emailError(value: string): string | null {
  const email = value.trim();
  if (!email) return null;
  if (!EMAIL_RE.test(email)) return 'Enter a valid email, or leave this blank.';
  return null;
}

/** Login accepts a public handle or a vaulted email. */
export function isEmailIdentifier(value: string): boolean {
  return value.trim().includes('@');
}

/** Accepts E.164, or common Kenyan local forms (07… / 254…). */
export function normalizePhone(value: string): string {
  const raw = value.trim().replace(/[\s()-]/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  if (/^0[17]\d{8}$/.test(raw)) return `+254${raw.slice(1)}`;
  if (/^254\d{9}$/.test(raw)) return `+${raw}`;
  return raw.startsWith('+') ? raw : `+${raw}`;
}

export function phoneError(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = normalizePhone(raw);
  if (!E164_RE.test(normalized)) {
    return 'Use international format, e.g. +2547XXXXXXXX.';
  }
  return null;
}
