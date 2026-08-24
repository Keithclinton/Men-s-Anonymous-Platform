import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  breakGlass,
  decideVerification,
  getVerificationDetail,
  listAuditLog,
  listPendingVerifications,
  reinstateUser,
  suspendUser,
} from '../api/admin';
import { createResource } from '../api/resources';
import { createSupportGroup } from '../api/groups';
import { ApiError } from '../api/errors';
import type { AuditLogEntry, PendingVerification, VerificationDetail } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { Segmented } from '../components/ui/Segmented';
import { defaultScheduleInput, formatWhen, localInputToIso, staffRoleLabel } from '../lib/format';

function canAccess(
  staffRole: string | null | undefined,
  allowed: Array<'SUPPORT_AGENT' | 'STAFF_MODERATOR' | 'COMPLIANCE_OFFICER' | 'SUPER_ADMIN'>,
) {
  if (staffRole === 'SUPER_ADMIN') return true;
  return staffRole != null && allowed.includes(staffRole as (typeof allowed)[number]);
}

export function AdminPage() {
  const { user } = useAuth();
  const staffRole = user?.staffRole;
  const tabs = useMemo(
    () =>
      (
        [
          canAccess(staffRole, ['COMPLIANCE_OFFICER']) ? (['verify', 'Verifications'] as const) : null,
          canAccess(staffRole, ['SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER'])
            ? (['users', 'Users'] as const)
            : null,
          canAccess(staffRole, ['STAFF_MODERATOR']) ? (['content', 'Content'] as const) : null,
          canAccess(staffRole, ['SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER'])
            ? (['audit', 'Audit'] as const)
            : null,
        ] as const
      ).filter(Boolean) as Array<readonly ['verify' | 'users' | 'content' | 'audit', string]>,
    [staffRole],
  );

  const [tab, setTab] = useState<'verify' | 'users' | 'content' | 'audit'>(
    tabs[0]?.[0] ?? 'verify',
  );
  const [queue, setQueue] = useState<PendingVerification[]>([]);
  const [detail, setDetail] = useState<VerificationDetail | null>(null);
  const [audit, setAudit] = useState<AuditLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function refreshQueue() {
    setQueue(await listPendingVerifications());
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    if (!tabs.some((t) => t[0] === tab) && tabs[0]) {
      setTab(tabs[0][0]);
    }
  }, [user?.role, staffRole, tab, tabs]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    if (!canAccess(staffRole, ['COMPLIANCE_OFFICER'])) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void refreshQueue()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Admin load failed.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, staffRole]);

  if (user && user.role !== 'ADMIN') {
    return (
      <AppShell title="Admin">
        <Notice>Admin role required.</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin">
      <p className="mb-3 text-[13px] text-mist">{staffRoleLabel(staffRole)}</p>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setDetail(null);
              setNotice(null);
              if (id === 'audit') {
                void listAuditLog()
                  .then(setAudit)
                  .catch((err) => setError(err instanceof ApiError ? err.message : 'Audit failed.'));
              }
            }}
            className={
              tab === id
                ? 'shrink-0 rounded-full border border-brass/60 bg-surface-2 px-3.5 py-2 text-[13px] text-cream'
                : 'shrink-0 rounded-full border border-line px-3.5 py-2 text-[13px] text-mist'
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {notice ? (
        <div className="mb-3">
          <Notice>{notice}</Notice>
        </div>
      ) : null}

      {tab === 'verify' ? (
        detail ? (
          <Panel className="p-5">
            <button type="button" className="text-[13px] text-mist" onClick={() => setDetail(null)}>
              ← Queue
            </button>
            <p className="mt-3 text-[14px] text-cream">License: {detail.licenseNumber}</p>
            <p className="mt-1 text-[12px] text-mist">
              Provider {detail.pseudonymId}
              {detail.verifyingBody ? ` · ${detail.verifyingBody}` : ''}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                loading={acting}
                onClick={() => {
                  setActing(true);
                  void decideVerification(detail.id, 'APPROVED')
                    .then(() => refreshQueue())
                    .then(() => {
                      setDetail(null);
                      setNotice('Approved.');
                    })
                    .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed.'))
                    .finally(() => setActing(false));
                }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                loading={acting}
                onClick={() => {
                  setActing(true);
                  void decideVerification(detail.id, 'REJECTED')
                    .then(() => refreshQueue())
                    .then(() => {
                      setDetail(null);
                      setNotice('Rejected.');
                    })
                    .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed.'))
                    .finally(() => setActing(false));
                }}
              >
                Reject
              </Button>
            </div>
          </Panel>
        ) : loading ? (
          <p className="py-8 text-center text-[14px] text-mist">Loading…</p>
        ) : (
          <div className="flex flex-col gap-3">
            {queue.length === 0 ? (
              <Panel className="p-5">
                <p className="text-[14px] text-mist">No pending verifications.</p>
              </Panel>
            ) : (
              queue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="text-left"
                  onClick={() => {
                    void getVerificationDetail(item.id)
                      .then(setDetail)
                      .catch((err) =>
                        setError(err instanceof ApiError ? err.message : 'Couldn’t open.'),
                      );
                  }}
                >
                  <Panel className="p-4">
                    <p className="text-[14px] text-cream">{item.pseudonymId.slice(0, 8)}…</p>
                    <p className="mt-1 text-[12px] text-mist">
                      {item.verifyingBody ?? 'No body'} · {formatWhen(item.createdAt)}
                    </p>
                  </Panel>
                </button>
              ))
            )}
          </div>
        )
      ) : null}

      {tab === 'users' ? (
        <UserTools
          onNotice={setNotice}
          onError={setError}
          canSuspend={canAccess(staffRole, ['SUPPORT_AGENT', 'STAFF_MODERATOR'])}
          canBreakGlass={canAccess(staffRole, ['COMPLIANCE_OFFICER'])}
        />
      ) : null}
      {tab === 'content' ? <ContentTools onNotice={setNotice} onError={setError} /> : null}

      {tab === 'audit' ? (
        <div className="flex flex-col gap-2">
          {audit.map((entry) => (
            <Panel key={entry.id} className="p-3">
              <p className="text-[13px] text-cream">{entry.action}</p>
              <p className="mt-1 text-[11px] text-mist">
                {entry.actorPseudonym.slice(0, 8)}… → {entry.target.slice(0, 12)}… ·{' '}
                {formatWhen(entry.timestamp)}
              </p>
            </Panel>
          ))}
        </div>
      ) : null}
    </AppShell>
  );
}

function UserTools({
  onNotice,
  onError,
  canSuspend,
  canBreakGlass,
}: {
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
  canSuspend: boolean;
  canBreakGlass: boolean;
}) {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [glass, setGlass] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {canSuspend ? (
        <Panel className="p-5">
          <FieldGroup>
            <Field
              label="User id (pseudonym)"
              name="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </FieldGroup>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              loading={acting}
              onClick={() => {
                setActing(true);
                void suspendUser(userId.trim())
                  .then(() => onNotice('User suspended.'))
                  .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed.'))
                  .finally(() => setActing(false));
              }}
            >
              Suspend
            </Button>
            <Button
              variant="secondary"
              loading={acting}
              onClick={() => {
                setActing(true);
                void reinstateUser(userId.trim())
                  .then(() => onNotice('User reinstated.'))
                  .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed.'))
                  .finally(() => setActing(false));
              }}
            >
              Reinstate
            </Button>
          </div>
        </Panel>
      ) : null}

      {canBreakGlass ? (
        <Panel className="p-5">
          <p className="text-[13px] text-mist">Break-glass vault access — justified and logged.</p>
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              setActing(true);
              void breakGlass(userId.trim(), reason.trim())
                .then((record) => {
                  setGlass(
                    `Name: ${record.name ?? '—'} · Email: ${record.email ?? '—'} · Phone: ${record.phone ?? '—'}`,
                  );
                  onNotice('Vault access logged.');
                })
                .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed.'))
                .finally(() => setActing(false));
            }}
          >
            <FieldGroup>
              {!canSuspend ? (
                <Field
                  label="User id (pseudonym)"
                  name="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              ) : null}
              <Field
                label="Reason (10+ chars)"
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
            </FieldGroup>
            <Button type="submit" variant="danger" loading={acting}>
              Break glass
            </Button>
          </form>
          {glass ? <p className="mt-3 break-all text-[13px] text-cream">{glass}</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}

function ContentTools({
  onNotice,
  onError,
}: {
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [topic, setTopic] = useState('');
  const [schedule, setSchedule] = useState(defaultScheduleInput);
  const [capacity, setCapacity] = useState('8');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'ARTICLE' | 'VIDEO'>('ARTICLE');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [acting, setActing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Support group</p>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            setActing(true);
            void createSupportGroup({
              topic: topic.trim(),
              schedule: localInputToIso(schedule),
              capacity: Number(capacity),
            })
              .then(() => {
                onNotice('Group created.');
                setTopic('');
              })
              .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed.'))
              .finally(() => setActing(false));
          }}
        >
          <FieldGroup>
            <Field label="Topic" name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
            <Field
              label="Schedule"
              type="datetime-local"
              name="schedule"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              required
            />
            <Field
              label="Capacity"
              type="number"
              name="capacity"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </FieldGroup>
          <Button type="submit" loading={acting}>
            Create group
          </Button>
        </form>
      </Panel>

      <Panel className="p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Resource</p>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            setActing(true);
            void createResource({
              type,
              title: title.trim(),
              body: body.trim() || undefined,
              url: url.trim() || undefined,
              published: true,
            })
              .then(() => {
                onNotice('Resource published.');
                setTitle('');
                setBody('');
                setUrl('');
              })
              .catch((err) => onError(err instanceof ApiError ? err.message : 'Failed.'))
              .finally(() => setActing(false));
          }}
        >
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: 'ARTICLE', label: 'Article', hint: 'Body text' },
              { value: 'VIDEO', label: 'Video', hint: 'URL' },
            ]}
          />
          <FieldGroup>
            <Field label="Title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Field label="Body" name="body" value={body} onChange={(e) => setBody(e.target.value)} />
            <Field label="URL" name="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </FieldGroup>
          <Button type="submit" loading={acting}>
            Publish resource
          </Button>
        </form>
      </Panel>
    </div>
  );
}
