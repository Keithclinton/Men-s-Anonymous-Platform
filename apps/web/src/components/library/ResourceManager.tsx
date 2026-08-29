import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/errors';
import type { ResourceItem, ResourceType } from '../../api/types';
import { Panel } from '../layout/Panel';
import { Button } from '../ui/Button';
import { Chip, StatusBadge } from '../ui/Chip';
import { Field } from '../ui/Field';
import { ResourceForm } from './ResourceForm';
import {
  loadManagedResources,
  matchesResourceQuery,
  removeResource,
  saveResource,
  setResourcePublished,
} from '../../lib/resources';
import { formatWhen } from '../../lib/format';

type Filter = 'all' | 'published' | 'draft';

export function ResourceManager({
  onNotice,
  onError,
}: {
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [rows, setRows] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [kind, setKind] = useState<'ALL' | ResourceType>('ALL');
  const [editing, setEditing] = useState<ResourceItem | null | 'new'>(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setRows(await loadManagedResources());
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void refresh()
      .catch((err) => {
        if (!cancelled) onError(err instanceof ApiError ? err.message : 'Couldn’t load resources.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (filter === 'published' && !row.published) return false;
      if (filter === 'draft' && row.published) return false;
      if (kind !== 'ALL' && row.type !== kind) return false;
      return matchesResourceQuery(row, query);
    });
  }, [rows, filter, kind, query]);

  const editingItem = editing === 'new' ? null : editing;

  return (
    <div className="flex flex-col gap-3">
      <Panel className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-brass">Resource lifecycle</p>
            <p className="mt-2 text-[13px] leading-5 text-mist">
              Draft, publish, edit, and take down. If the API has no PATCH/DELETE yet, changes stay on this device and
              still drive the member library here.
            </p>
          </div>
          {editing == null ? (
            <div className="w-full sm:w-40">
              <Button onClick={() => setEditing('new')}>New resource</Button>
            </div>
          ) : null}
        </div>
      </Panel>

      {editing != null ? (
        <Panel className="p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-sage">
            {editing === 'new' ? 'New' : 'Edit'}
          </p>
          <div className="mt-3">
            <ResourceForm
              key={editingItem?.id ?? 'new'}
              existing={editingItem}
              saving={saving}
              onCancel={() => setEditing(null)}
              onSubmit={(input) => {
                setSaving(true);
                void saveResource(editingItem, input)
                  .then(({ localOnly }) => {
                    onNotice(
                      localOnly
                        ? 'Saved on this device. Backend still needs PATCH/PUT /resources/:id (and POST for new items if that also 404s).'
                        : input.published
                          ? 'Resource saved and visible in the library.'
                          : 'Draft saved.',
                    );
                    setEditing(null);
                    return refresh();
                  })
                  .catch((err) => onError(err instanceof ApiError ? err.message : 'Couldn’t save.'))
                  .finally(() => setSaving(false));
              }}
            />
          </div>
        </Panel>
      ) : null}

      <Panel className="p-4 sm:p-5">
        <Field
          label="Search"
          name="resourceQuery"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, body, or tag"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'published', 'draft'] as const).map((id) => (
            <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
              {id === 'all' ? 'All' : id === 'published' ? 'Published' : 'Drafts'}
            </Chip>
          ))}
          {(['ALL', 'ARTICLE', 'VIDEO'] as const).map((id) => (
            <Chip key={id} active={kind === id} onClick={() => setKind(id)}>
              {id === 'ALL' ? 'Any kind' : id === 'ARTICLE' ? 'Articles' : 'Videos'}
            </Chip>
          ))}
        </div>
      </Panel>

      {loading ? <p className="py-4 text-center text-[14px] text-mist">Loading resources…</p> : null}

      {!loading && visible.length === 0 ? (
        <Panel className="p-5">
          <p className="text-[14px] text-mist">No resources in this filter.</p>
        </Panel>
      ) : null}

      {visible.map((item) => (
        <Panel key={item.id} className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-xl text-cream">{item.title}</p>
              <p className="mt-1 text-[12px] text-mist">
                {item.type} · {formatWhen(item.updatedAt ?? item.createdAt)}
                {item.tags.length ? ` · ${item.tags.join(', ')}` : ''}
              </p>
            </div>
            <StatusBadge tone={item.published ? 'sage' : 'brass'}>
              {item.published ? 'Published' : 'Draft'}
            </StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="secondary" onClick={() => setEditing(item)}>
              Edit
            </Button>
            <Button
              variant="secondary"
              loading={saving}
              onClick={() => {
                setSaving(true);
                void setResourcePublished(item, !item.published)
                  .then(({ localOnly }) => {
                    onNotice(
                      localOnly
                        ? item.published
                          ? 'Unpublished on this device. API has no PATCH /resources/:id yet.'
                          : 'Published on this device. API has no PATCH /resources/:id yet.'
                        : item.published
                          ? 'Unpublished.'
                          : 'Published.',
                    );
                    return refresh();
                  })
                  .catch((err) => onError(err instanceof ApiError ? err.message : 'Couldn’t update.'))
                  .finally(() => setSaving(false));
              }}
            >
              {item.published ? 'Unpublish' : 'Publish'}
            </Button>
            <Link
              to={`/library/${item.id}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-line px-5 text-[15px] text-cream"
            >
              {item.published ? 'Open' : 'Preview'}
            </Link>
            <Button
              variant="danger"
              loading={saving}
              onClick={() => {
                if (!window.confirm(`Take “${item.title}” out of the library?`)) return;
                setSaving(true);
                void removeResource(item)
                  .then(({ localOnly }) => {
                    onNotice(
                      localOnly
                        ? 'Removed on this device. API has no DELETE /resources/:id yet.'
                        : 'Resource deleted.',
                    );
                    if (editingItem?.id === item.id) setEditing(null);
                    return refresh();
                  })
                  .catch((err) => onError(err instanceof ApiError ? err.message : 'Couldn’t delete.'))
                  .finally(() => setSaving(false));
              }}
            >
              Delete
            </Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}