import { ApiError, isUnimplemented } from './errors';
import { request } from './client';
import type { ResourceInput, ResourceItem } from './types';

export function listResources(tag?: string): Promise<ResourceItem[]> {
  const query = tag ? `?tag=${encodeURIComponent(tag)}` : '';
  return request<ResourceItem[]>(`/resources${query}`);
}

export async function listManagedResources(): Promise<ResourceItem[]> {
  try {
    return await request<ResourceItem[]>('/admin/resources');
  } catch (err) {
    if (isUnimplemented(err) || (err instanceof ApiError && err.isUnauthorized)) {
      return listResources();
    }
    throw err;
  }
}

export function getResource(id: string): Promise<ResourceItem> {
  return request<ResourceItem>(`/resources/${id}`);
}

export function createResource(body: ResourceInput): Promise<ResourceItem> {
  return request<ResourceItem>('/resources', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateResource(id: string, body: ResourceInput): Promise<ResourceItem> {
  try {
    return await request<ResourceItem>(`/resources/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (!isUnimplemented(err)) throw err;
    return request<ResourceItem>(`/resources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}

export function deleteResource(id: string): Promise<void> {
  return request(`/resources/${id}`, { method: 'DELETE' });
}
