import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/errors';
import {
  joinSupportGroup,
  leaveSupportGroup,
  listMySupportGroups,
  listSupportGroups,
} from '../api/groups';
import type { ResourceItem, ResourceType, SupportGroup, SupportGroupMembership } from '../api/types';
import { useAuth } from '../auth/useAuth';
import { ResourceReader } from '../components/library/ResourceReader';
import { AppShell } from '../components/layout/AppShell';
import { Panel } from '../components/layout/Panel';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Field } from '../components/ui/Field';
import { Notice } from '../components/ui/Notice';
import { formatWhen } from '../lib/format';
import { loadPublicResources, loadResource, matchesResourceQuery } from '../lib/resources';

export function LibraryPage() {
  const { resourceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<'groups' | 'resources'>(resourceId ? 'resources' : 'groups');
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [mine, setMine] = useState<SupportGroupMembership[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selected, setSelected] = useState<ResourceItem | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [kind, setKind] = useState<'ALL' | ResourceType>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const canJoin = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';

  async function refresh() {
    const [g, m, r] = await Promise.all([
      listSupportGroups(),
      canJoin ? listMySupportGroups().catch(() => [] as SupportGroupMembership[]) : Promise.resolve([]),
      loadPublicResources(),
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

  useEffect(() => {
    if (!resourceId) {
      setSelected(null);
      return;
    }
    setTab('resources');
    let cancelled = false;
    void loadResource(resourceId)
      .then((item) => {
        if (cancelled) return;
        if (!item || (!item.published && !isAdmin)) {
          setSelected(null);
          setError('That resource isn’t published.');
          return;
        }
        setError(null);
        setSelected(item);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Couldn’t open.');
      });
    return () => {
      cancelled = true;
    };
  }, [resourceId, isAdmin]);

  const mineIds = new Set(mine.map((row) => row.groupId));
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const row of resources) {
      for (const item of row.tags) set.add(item);
    }
    return [...set].sort();
  }, [resources]);

  const visible = useMemo(() => {
    return resources.filter((row) => {
      if (kind !== 'ALL' && row.type !== kind) return false;
      if (tag && !row.tags.includes(tag)) return false;
      return matchesResourceQuery(row, query);
    });
  }, [resources, kind, tag, query]);

  return (
    <AppShell
      title="Library"
      eyebrow="For members"
      subtitle="Support groups and published reads. Join only as a client; everyone can browse."
      backTo={resourceId ? '/library' : undefined}
      backLabel="Library"
    >
      {user?.role === 'CLIENT' && !resourceId ? (
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
      ) : null}
      {isAdmin && !resourceId ? (
        <Panel className="mb-5 p-5">
          <p className="text-[13px] text-mist">
            This is the public library. Draft, edit, unpublish, and delete from Console → Publish.
          </p>
          <Link
            to="/admin"
            className="mt-2 inline-flex text-[14px] text-cream underline decoration-line underline-offset-4"
          >
            Open console
          </Link>
        </Panel>
      ) : null}

      {!resourceId ? (
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
                setError(null);
              }}
            >
              {label}
            </Chip>
          ))}
        </div>
      ) : null}

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {loading && !resourceId ? <p className="py-8 text-center text-[14px] text-mist">Loading…</p> : null}

      {tab === 'groups' && !loading && !resourceId ? (
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

      {tab === 'resources' && resourceId && !selected && !error ? (
        <p className="py-8 text-center text-[14px] text-mist">Opening…</p>
      ) : null}

      {tab === 'resources' && resourceId && selected ? (
        <Panel className="max-w-3xl p-6 lg:p-8">
          <ResourceReader item={selected} />
        </Panel>
      ) : null}

      {tab === 'resources' && !resourceId && !loading ? (
        <div className="flex flex-col gap-3">
          <Panel className="p-4 sm:p-5">
            <Field
              label="Search"
              name="libraryQuery"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title or tag"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {(['ALL', 'ARTICLE', 'VIDEO'] as const).map((id) => (
                <Chip key={id} active={kind === id} onClick={() => setKind(id)}>
                  {id === 'ALL' ? 'All' : id === 'ARTICLE' ? 'Articles' : 'Videos'}
                </Chip>
              ))}
              {tags.map((item) => (
                <Chip
                  key={item}
                  active={tag === item}
                  onClick={() => setTag((prev) => (prev === item ? null : item))}
                >
                  {item}
                </Chip>
              ))}
            </div>
          </Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.length === 0 ? (
              <Panel className="p-6 sm:col-span-2">
                <p className="text-[14px] text-mist">No published resources in this filter.</p>
              </Panel>
            ) : (
              visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="h-full text-left"
                  onClick={() => navigate(`/library/${item.id}`)}
                >
                  <Panel className="h-full p-5 transition hover:border-brass/35">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-sage">{item.type}</p>
                    <p className="mt-2 font-display text-xl text-cream">{item.title}</p>
                    {item.tags.length ? (
                      <p className="mt-2 text-[12px] text-mist">{item.tags.join(' · ')}</p>
                    ) : null}
                  </Panel>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
