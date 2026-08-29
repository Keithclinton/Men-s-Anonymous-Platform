import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  breakGlass,
  decideVerification,
  getVerificationDetail,
  listAuditLog,
  listPendingVerifications,
  reinstateUser,
  searchUsers,
  suspendUser,
} from '../api/admin';
import { createSupportGroup } from '../api/groups';
import { ApiError, isUnimplemented } from '../api/errors';
import type { AuditLogEntry, PendingVerification, VerificationDetail } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { BadgeIcon, BookIcon, PulseIcon, UsersIcon } from '../components/icons';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { ToolTile } from '../components/ui/ActionCard';
import { Button } from '../components/ui/Button';
import { Field, FieldGroup, TextArea } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { ResourceManager } from '../components/library/ResourceManager';
import { defaultScheduleInput, formatWhen, localInputToIso, staffRoleLabel } from '../lib/format';

type Section = 'home' | 'verify' | 'users' | 'content' | 'audit';

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
  const canVerify = canAccess(staffRole, ['COMPLIANCE_OFFICER']);
  const canUsers = canAccess(staffRole, ['SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER']);
  const canContent = canAccess(staffRole, ['STAFF_MODERATOR']);
  const canAudit = canAccess(staffRole, ['SUPPORT_AGENT', 'STAFF_MODERATOR', 'COMPLIANCE_OFFICER']);

  const [section, setSection] = useState<Section>('home');
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
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      canVerify ? listPendingVerifications() : Promise.resolve([] as PendingVerification[]),
      canAudit ? listAuditLog(40) : Promise.resolve([] as AuditLogEntry[]),
    ])
      .then(([pending, log]) => {
        if (cancelled) return;
        setQueue(pending);
        setAudit(log);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Admin load failed.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.role, staffRole, canVerify, canAudit]);

  if (user && user.role !== 'ADMIN') {
    return (
      <AppShell title="Console">
        <Notice>Admin role required.</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Console"
      eyebrow={staffRoleLabel(staffRole)}
      subtitle="Verification, people, published content, and the audit trail — one console."
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {canVerify ? (
          <ToolTile
            active={section === 'verify'}
            label="Verify"
            hint={loading ? '…' : `${queue.length} waiting`}
            icon={<BadgeIcon className="size-5" />}
            badge={queue.length || undefined}
            onClick={() => {
              setSection('verify');
              setDetail(null);
              setNotice(null);
            }}
          />
        ) : null}
        {canUsers ? (
          <ToolTile
            active={section === 'users'}
            label="People"
            hint="Suspend / vault"
            icon={<UsersIcon className="size-5" />}
            onClick={() => {
              setSection('users');
              setNotice(null);
            }}
          />
        ) : null}
        {canContent ? (
          <ToolTile
            active={section === 'content'}
            label="Publish"
            hint="Groups & reads"
            icon={<BookIcon className="size-5" />}
            onClick={() => {
              setSection('content');
              setNotice(null);
            }}
          />
        ) : null}
        {canAudit ? (
          <ToolTile
            active={section === 'audit'}
            label="Audit"
            hint="Logged actions"
            icon={<PulseIcon className="size-5" />}
            onClick={() => {
              setSection('audit');
              setNotice(null);
              void listAuditLog(40)
                .then(setAudit)
                .catch((err) => setError(err instanceof ApiError ? err.message : 'Audit failed.'));
            }}
          />
        ) : null}
      </div>

      {error ? (
        <div className="mb-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-3">
          <Notice>{notice}</Notice>
        </div>
      ) : null}

      {section === 'home' ? (
        <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sage">Start here</p>
          <p className="mt-2 font-display text-[1.35rem] text-cream">Pick a tool above</p>
          <p className="mt-2 text-[13px] leading-5 text-mist">
            Verification, people, publishing, and audit used to live in a scrolling chip row. They’re pinned to this
            console now.
          </p>
        </Panel>
          <Panel className="p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-brass">People</p>
            <p className="mt-2 text-[13px] leading-5 text-mist">
              Search from People when GET /admin/users exists. Until then, paste a pseudonym from the audit trail.
            </p>
          </Panel>
        </div>
      ) : null}

      {section === 'verify' ? (
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
                    <p className="font-mono text-[13px] text-cream">{item.pseudonymId}</p>
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

      {section === 'users' ? (
        <UserTools
          onNotice={setNotice}
          onError={setError}
          canSuspend={canAccess(staffRole, ['SUPPORT_AGENT', 'STAFF_MODERATOR'])}
          canBreakGlass={canAccess(staffRole, ['COMPLIANCE_OFFICER'])}
          audit={audit}
        />
      ) : null}
      {section === 'content' ? <ContentTools onNotice={setNotice} onError={setError} /> : null}

      {section === 'audit' ? (
        <div className="flex flex-col gap-2">
          {audit.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No audit rows yet.</p>
            </Panel>
          ) : (
            audit.map((entry) => (
              <Panel key={entry.id} className="p-4">
                <p className="text-[13px] text-cream">{entry.action.replaceAll('_', ' ')}</p>
                <p className="mt-1 break-all font-mono text-[11px] text-mist">
                  {entry.actorPseudonym} → {entry.target} · {formatWhen(entry.timestamp)}
                </p>
              </Panel>
            ))
          )}
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
  audit,
}: {
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
  canSuspend: boolean;
  canBreakGlass: boolean;
  audit: AuditLogEntry[];
}) {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [glass, setGlass] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Array<{ id: string; username: string; role: string }>>([]);
  const [searchNote, setSearchNote] = useState<string | null>(null);

  const recentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of audit) {
      if (entry.target) ids.add(entry.target);
      if (entry.actorPseudonym) ids.add(entry.actorPseudonym);
    }
    return [...ids].slice(0, 8);
  }, [audit]);

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Search</p>
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            const q = query.trim();
            if (!q) return;
            setActing(true);
            void searchUsers(q)
              .then((rows) => {
                setHits(rows);
                setSearchNote(rows.length ? null : 'No matches.');
              })
              .catch((err) => {
                setHits([]);
                setSearchNote(
                  isUnimplemented(err)
                    ? 'User search needs GET /admin/users?q= on the API. Paste a UUID below until then.'
                    : err instanceof ApiError
                      ? err.message
                      : 'Search failed.',
                );
              })
              .finally(() => setActing(false));
          }}
        >
          <div className="min-w-0 flex-1">
            <Field
              label="Handle or id"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="quietcedar or uuid"
            />
          </div>
          <div className="sm:w-28 sm:self-end sm:pb-3">
            <Button type="submit" loading={acting}>
              Search
            </Button>
          </div>
        </form>
        {searchNote ? <p className="mt-2 text-[13px] text-mist">{searchNote}</p> : null}
        {hits.length > 0 ? (
          <ul className="mt-3 divide-y divide-line/70">
            {hits.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setUserId(row.id)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] text-cream">{row.username}</span>
                    <span className="font-mono text-[11px] text-mist">{row.id.slice(0, 8)}…</span>
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-[0.12em] text-sage">{row.role}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      {recentIds.length > 0 ? (
        <Panel className="p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-brass">From the audit trail</p>
          <p className="mt-1 text-[12px] text-mist">Tap to fill the user id.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recentIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setUserId(id)}
                className={
                  userId === id
                    ? 'rounded-full border border-brass/55 bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-cream'
                    : 'rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-mist hover:text-cream'
                }
              >
                {id.slice(0, 8)}…
              </button>
            ))}
          </div>
        </Panel>
      ) : null}

      {canSuspend ? (
        <Panel className="p-5">
          <FieldGroup>
            <Field
              label="User id (pseudonym)"
              name="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="uuid"
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
              <TextArea
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
  const [groupActing, setGroupActing] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Support group</p>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            setGroupActing(true);
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
              .finally(() => setGroupActing(false));
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
          <Button type="submit" loading={groupActing}>
            Create group
          </Button>
        </form>
      </Panel>

      <ResourceManager onNotice={onNotice} onError={onError} />
    </div>
  );
}
