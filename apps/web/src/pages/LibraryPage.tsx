import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api/errors';
import {
  joinSupportGroup,
  leaveSupportGroup,
  listMySupportGroups,
  listSupportGroups,
} from '../api/groups';
import { getResource, listResources } from '../api/resources';
import type { ResourceItem, SupportGroup, SupportGroupMembership } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Notice } from '../components/ui/Notice';
import { formatWhen } from '../lib/format';

export function LibraryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'groups' | 'resources'>('groups');
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [mine, setMine] = useState<SupportGroupMembership[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const canJoin = user?.role === 'CLIENT';

  async function refresh() {
    const [g, m, r] = await Promise.all([
      listSupportGroups(),
      canJoin ? listMySupportGroups().catch(() => [] as SupportGroupMembership[]) : Promise.resolve([]),
      listResources(),
    ]);
    setGroups(g);
    setMine(m);
    setResources(r);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t load library.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canJoin]);

  const mineIds = new Set(mine.map((m) => m.groupId));

  return (
    <AppShell
      title="Library"
      eyebrow="For members"
      subtitle="Support groups and published reads. Join only as a client; everyone can browse."
    >
      {user?.role === 'CLIENT' ? (
        <Panel className="mb-5 flex items-center justify-between gap-3 p-5">
          <div>
            <p className="text-[13px] text-cream">Session packs</p>
            <p className="mt-0.5 text-[12px] text-mist">Monthly plans via M-Pesa (Phase 2).</p>
          </div>
          <Link
            to="/plans"
            className="shrink-0 rounded-full border border-line px-3.5 py-2 text-[13px] text-cream transition hover:border-mist/40"
          >
            View plans
          </Link>
        </Panel>
      ) : user?.role === 'ADMIN' ? (
        <Panel className="mb-5 p-5">
          <p className="text-[13px] text-mist">
            This is the public library. Publish new groups and articles from Console → Publish.
          </p>
          <Link
            to="/admin"
            className="mt-2 inline-flex text-[14px] text-cream underline decoration-line underline-offset-4"
          >
            Open console
          </Link>
        </Panel>
      ) : null}

      <div className="mb-5 flex gap-2">
        {(
          [
            ['groups', 'Groups'],
            ['resources', 'Resources'],
          ] as const
        ).map(([id, label]) => (
          <Chip
            key={id}
            active={tab === id}
            onClick={() => {
              setTab(id);
              setSelected(null);
            }}
          >
            {label}
          </Chip>
        ))}
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {loading ? <p className="py-8 text-center text-[14px] text-mist">Loading…</p> : null}

      {tab === 'groups' && !loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {groups.length === 0 ? (
            <Panel className="p-6 sm:col-span-2">
              <p className="text-[14px] text-mist">No upcoming support groups yet.</p>
            </Panel>
          ) : (
            groups.map((group) => {
              const joined = mineIds.has(group.id);
              return (
                <Panel key={group.id} className="flex flex-col p-5">
                  <p className="font-display text-xl text-cream">{group.topic}</p>
                  <p className="mt-2 text-[13px] text-mist">
                    {formatWhen(group.schedule)} · {group.memberCount}/{group.capacity} members
                  </p>
                  {canJoin ? (
                    <div className="mt-4 max-w-[9rem]">
                      <Button
                        variant={joined ? 'secondary' : 'primary'}
                        loading={acting}
                        onClick={() => {
                          setActing(true);
                          void (joined ? leaveSupportGroup(group.id) : joinSupportGroup(group.id))
                            .then(() => refresh())
                            .catch((err) =>
                              setError(err instanceof ApiError ? err.message : 'Action failed.'),
                            )
                            .finally(() => setActing(false));
                        }}
                      >
                        {joined ? 'Leave' : 'Join'}
                      </Button>
                    </div>
                  ) : null}
                </Panel>
              );
            })
          )}
        </div>
      ) : null}

      {tab === 'resources' && !loading ? (
        selected ? (
          <Panel className="max-w-3xl p-6 lg:p-8">
            <button
              type="button"
              className="text-[13px] text-mist hover:text-cream"
              onClick={() => setSelected(null)}
            >
              ← Back
            </button>
            <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-sage">{selected.type}</p>
            <h2 className="mt-2 font-display text-2xl text-cream">{selected.title}</h2>
            {selected.body ? (
              <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-mist">{selected.body}</p>
            ) : null}
            {selected.url ? (
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-block text-[14px] text-brass underline"
              >
                Open link
              </a>
            ) : null}
          </Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {resources.length === 0 ? (
              <Panel className="p-6 sm:col-span-2">
                <p className="text-[14px] text-mist">No published resources yet.</p>
              </Panel>
            ) : (
              resources.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="h-full text-left"
                  onClick={() => {
                    void getResource(item.id)
                      .then(setSelected)
                      .catch((err) =>
                        setError(err instanceof ApiError ? err.message : 'Couldn’t open.'),
                      );
                  }}
                >
                  <Panel className="h-full p-5 transition hover:border-brass/35">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-sage">{item.type}</p>
                    <p className="mt-2 font-display text-xl text-cream">{item.title}</p>
                  </Panel>
                </button>
              ))
            )}
          </div>
        )
      ) : null}
    </AppShell>
  );
}
