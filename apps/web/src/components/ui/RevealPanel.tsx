import { useEffect, useState, type FormEvent } from 'react';
import { createReveal, listMyReveals, revokeReveal } from '../../api/reveals';
import { ApiError } from '../../api/errors';
import type { RevealGrant, RevealLevel } from '../../api/types';
import { Button } from './Button';
import { Field, FieldGroup } from './Field';
import { Notice } from './Notice';
import { Segmented } from './Segmented';
import { Panel } from '../layout/Panel';
import { revealLevelLabel } from '../../lib/format';

export function RevealPanel({
  providerId,
  bookingId,
}: {
  providerId: string;
  bookingId: string;
}) {
  const [grants, setGrants] = useState<RevealGrant[]>([]);
  const [level, setLevel] = useState<RevealLevel>('FIRST_NAME');
  const [firstName, setFirstName] = useState('');
  const [fullName, setFullName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const active = grants.find(
    (g) => g.active && g.providerId === providerId && (g.bookingId === bookingId || !g.bookingId),
  );

  async function refresh() {
    const rows = await listMyReveals();
    setGrants(rows.filter((g) => g.providerId === providerId));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load reveals.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, bookingId]);

  async function onGrant(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createReveal({
        providerId,
        bookingId,
        level,
        firstName: level === 'ANONYMOUS' ? undefined : firstName.trim() || undefined,
        fullName:
          level === 'FULL_NAME' || level === 'NAME_PHOTO' ? fullName.trim() || undefined : undefined,
        photoUrl: level === 'NAME_PHOTO' ? photoUrl.trim() || undefined : undefined,
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t update reveal.');
    } finally {
      setSaving(false);
    }
  }

  async function onRevoke() {
    if (!active) return;
    setSaving(true);
    setError(null);
    try {
      await revokeReveal(active.id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t revoke.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel className="p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">Reveal</p>
      <p className="mt-2 text-[13px] leading-5 text-mist">
        Optional. Scoped to this provider/session. Revoke only affects future sessions — history stays.
      </p>

      {loading ? <p className="mt-3 text-[13px] text-mist">Loading…</p> : null}
      {error ? (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      {active && active.level !== 'ANONYMOUS' ? (
        <div className="mt-4 rounded-2xl border border-line bg-ink/35 px-4 py-3">
          <p className="text-[14px] text-cream">
            Active: {revealLevelLabel(active.level)}
            {active.firstName ? ` · ${active.firstName}` : ''}
            {active.fullName ? ` · ${active.fullName}` : ''}
          </p>
          <Button variant="secondary" className="mt-3" loading={saving} onClick={() => void onRevoke()}>
            Revoke for future
          </Button>
        </div>
      ) : null}

      <form onSubmit={onGrant} className="mt-4 flex flex-col gap-3">
        <Segmented
          legend="Level"
          value={level}
          onChange={setLevel}
          options={[
            { value: 'FIRST_NAME', label: 'First name', hint: '+ handle' },
            { value: 'FULL_NAME', label: 'Full name', hint: '+ handle' },
            { value: 'NAME_PHOTO', label: 'Name + photo', hint: 'Highest' },
            { value: 'ANONYMOUS', label: 'Anonymous', hint: 'Handle only' },
          ]}
        />

        {level !== 'ANONYMOUS' ? (
          <FieldGroup>
            <Field
              label="First name"
              name="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            {level === 'FULL_NAME' || level === 'NAME_PHOTO' ? (
              <Field
                label="Full name"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            ) : null}
            {level === 'NAME_PHOTO' ? (
              <div className="px-4 py-3">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-mist">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-[13px] text-mist file:mr-3 file:rounded-full file:border-0 file:bg-brass file:px-3 file:py-1.5 file:text-ink"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 400_000) {
                      setError('Keep the photo under 400KB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setPhotoUrl(String(reader.result ?? ''));
                    reader.readAsDataURL(file);
                  }}
                />
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="mt-3 size-20 rounded-2xl object-cover" />
                ) : null}
                <p className="mt-1.5 text-[12px] text-mist/75">This device only until the API stores the file. Not a public profile photo.</p>
              </div>
            ) : null}
          </FieldGroup>
        ) : null}

        <Button type="submit" loading={saving}>
          {level === 'ANONYMOUS' ? 'Set anonymous' : 'Grant reveal'}
        </Button>
      </form>
    </Panel>
  );
}
