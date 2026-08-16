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
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Notice } from '../components/ui/Notice';
import { formatWhen } from '../lib/format';

export function LibraryPage() {
  const [tab, setTab] = useState<'groups' | 'resources'>('groups');
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [mine, setMine] = useState<SupportGroupMembership[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function refresh() {
    const [g, m, r] = await Promise.all([
      listSupportGroups(),
      listMySupportGroups().catch(() => [] as SupportGroupMembership[]),
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
  }, []);

  const mineIds = new Set(mine.map((m) => m.groupId));

  return (
    <AppShell title="More">
      <Panel className="mb-4 p-4">
        <p className="text-[13px] text-mist">Monthly session packs (Phase 2)</p>
        <Link
          to="/plans"
          className="mt-2 inline-flex text-[14px] text-cream underline decoration-line underline-offset-4"
        >
          View plans
        </Link>
      </Panel>
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTab('groups');
            setSelected(null);
          }}
          className={
            tab === 'groups'
              ? 'rounded-full border border-brass/60 bg-surface-2 px-3.5 py-2 text-[13px] text-cream'
              : 'rounded-full border border-line px-3.5 py-2 text-[13px] text-mist'
          }
        >
          Groups
        </button>
        <button
          type="button"
          onClick={() => setTab('resources')}
          className={
            tab === 'resources'
              ? 'rounded-full border border-brass/60 bg-surface-2 px-3.5 py-2 text-[13px] text-cream'
              : 'rounded-full border border-line px-3.5 py-2 text-[13px] text-mist'
          }
        >
          Resources
        </button>
        <Link
          to="/match"
          className="ml-auto rounded-full border border-line px-3.5 py-2 text-[13px] text-mist hover:text-cream"
        >
          Auto-match
        </Link>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {loading ? <p className="py-8 text-center text-[14px] text-mist">Loading…</p> : null}

      {tab === 'groups' && !loading ? (
        <div className="flex flex-col gap-3">
          {groups.length === 0 ? (
            <Panel className="p-5">
              <p className="text-[14px] text-mist">No upcoming support groups yet.</p>
            </Panel>
          ) : (
            groups.map((group) => {
              const joined = mineIds.has(group.id);
              return (
                <Panel key={group.id} className="p-4">
                  <p className="font-display text-lg text-cream">{group.topic}</p>
                  <p className="mt-1 text-[12px] text-mist">
                    {formatWhen(group.schedule)} · {group.memberCount}/{group.capacity} members
                  </p>
                  <Button
                    className="mt-3"
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
                </Panel>
              );
            })
          )}
        </div>
      ) : null}

      {tab === 'resources' && !loading ? (
        selected ? (
          <Panel className="p-5">
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
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-mist">{selected.body}</p>
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
          <div className="flex flex-col gap-3">
            {resources.length === 0 ? (
              <Panel className="p-5">
                <p className="text-[14px] text-mist">No published resources yet.</p>
              </Panel>
            ) : (
              resources.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="text-left"
                  onClick={() => {
                    void getResource(item.id)
                      .then(setSelected)
                      .catch((err) =>
                        setError(err instanceof ApiError ? err.message : 'Couldn’t open.'),
                      );
                  }}
                >
                  <Panel className="p-4 transition hover:border-mist/30">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-sage">{item.type}</p>
                    <p className="mt-1 font-display text-lg text-cream">{item.title}</p>
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
