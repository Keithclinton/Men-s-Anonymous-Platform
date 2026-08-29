import { ApiError, isUnimplemented } from '../api/errors';
import {
  createResource,
  deleteResource,
  getResource,
  listManagedResources,
  listResources,
  updateResource,
} from '../api/resources';
import type { ResourceInput, ResourceItem } from '../api/types';

const KEY = 'map.resourceOverlay.v1';

type Overlay = {
  items: Record<string, ResourceItem>;
  deleted: string[];
};

function emptyOverlay(): Overlay {
  return { items: {}, deleted: [] };
}

function readOverlay(): Overlay {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyOverlay();
    const parsed = JSON.parse(raw) as Overlay;
    if (!parsed || typeof parsed.items !== 'object' || !Array.isArray(parsed.deleted)) {
      return emptyOverlay();
    }
    return parsed;
  } catch {
    return emptyOverlay();
  }
}

function writeOverlay(next: Overlay) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function isLocalResourceId(id: string) {
  return id.startsWith('local-');
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function videoEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function overlayUpsert(item: ResourceItem) {
  const overlay = readOverlay();
  overlay.items[item.id] = item;
  overlay.deleted = overlay.deleted.filter((id) => id !== item.id);
  writeOverlay(overlay);
}

function overlayDelete(id: string) {
  const overlay = readOverlay();
  delete overlay.items[id];
  if (!overlay.deleted.includes(id)) overlay.deleted.push(id);
  writeOverlay(overlay);
}

export function mergeResourceList(remote: ResourceItem[]): ResourceItem[] {
  const overlay = readOverlay();
  const map = new Map(remote.map((row) => [row.id, row]));
  for (const item of Object.values(overlay.items)) {
    map.set(item.id, item);
  }
  for (const id of overlay.deleted) {
    map.delete(id);
  }
  return [...map.values()].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
}

export function publicResources(rows: ResourceItem[]): ResourceItem[] {
  return rows.filter((row) => row.published);
}

export async function loadPublicResources(): Promise<ResourceItem[]> {
  const remote = await listResources();
  return publicResources(mergeResourceList(remote));
}

export async function loadManagedResources(): Promise<ResourceItem[]> {
  const remote = await listManagedResources();
  return mergeResourceList(remote);
}

export async function loadResource(id: string): Promise<ResourceItem | null> {
  const overlay = readOverlay();
  if (overlay.deleted.includes(id)) return null;
  if (overlay.items[id]) return overlay.items[id];
  if (isLocalResourceId(id)) return null;
  try {
    const remote = await getResource(id);
    return mergeResourceList([remote])[0] ?? remote;
  } catch (err) {
    if (isUnimplemented(err) || (err instanceof ApiError && err.statusCode === 404)) {
      return null;
    }
    throw err;
  }
}

export async function saveResource(
  existing: ResourceItem | null,
  input: ResourceInput,
): Promise<{ item: ResourceItem; localOnly: boolean }> {
  const payload: ResourceInput = {
    type: input.type,
    title: input.title.trim(),
    body: input.body?.trim() || undefined,
    url: input.url?.trim() || undefined,
    tags: input.tags ?? [],
    published: input.published ?? true,
  };

  const stamp = new Date().toISOString();

  if (!existing) {
    try {
      const saved = await createResource(payload);
      overlayUpsert(saved);
      return { item: saved, localOnly: false };
    } catch (err) {
      if (!isUnimplemented(err)) throw err;
      const item: ResourceItem = {
        id: `local-${crypto.randomUUID()}`,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        url: payload.url ?? null,
        tags: payload.tags ?? [],
        published: payload.published ?? true,
        createdAt: stamp,
        updatedAt: stamp,
      };
      overlayUpsert(item);
      return { item, localOnly: true };
    }
  }

  if (isLocalResourceId(existing.id)) {
    const item: ResourceItem = {
      ...existing,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      url: payload.url ?? null,
      tags: payload.tags ?? [],
      published: payload.published ?? true,
      updatedAt: stamp,
    };
    overlayUpsert(item);
    return { item, localOnly: true };
  }

  try {
    const saved = await updateResource(existing.id, payload);
    overlayUpsert(saved);
    return { item: saved, localOnly: false };
  } catch (err) {
    if (!isUnimplemented(err)) throw err;
    const item: ResourceItem = {
      ...existing,
      type: payload.type,
      title: payload.title,
      body: payload.body ?? null,
      url: payload.url ?? null,
      tags: payload.tags ?? [],
      published: payload.published ?? true,
      updatedAt: stamp,
    };
    overlayUpsert(item);
    return { item, localOnly: true };
  }
}

export async function setResourcePublished(
  item: ResourceItem,
  published: boolean,
): Promise<{ item: ResourceItem; localOnly: boolean }> {
  return saveResource(item, {
    type: item.type,
    title: item.title,
    body: item.body ?? undefined,
    url: item.url ?? undefined,
    tags: item.tags,
    published,
  });
}

export async function removeResource(item: ResourceItem): Promise<{ localOnly: boolean }> {
  if (!isLocalResourceId(item.id)) {
    try {
      await deleteResource(item.id);
      overlayDelete(item.id);
      return { localOnly: false };
    } catch (err) {
      if (!isUnimplemented(err)) throw err;
      overlayDelete(item.id);
      return { localOnly: true };
    }
  }
  overlayDelete(item.id);
  return { localOnly: true };
}

export function matchesResourceQuery(item: ResourceItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.title.toLowerCase().includes(q) ||
    (item.body ?? '').toLowerCase().includes(q) ||
    item.tags.some((tag) => tag.includes(q))
  );
}
