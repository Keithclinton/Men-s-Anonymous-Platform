import { request } from './client';
import type { ResourceItem } from './types';

export function listResources(tag?: string): Promise<ResourceItem[]> {
  const query = tag ? `?tag=${encodeURIComponent(tag)}` : '';
  return request<ResourceItem[]>(`/resources${query}`);
}

export function getResource(id: string): Promise<ResourceItem> {
  return request<ResourceItem>(`/resources/${id}`);
}

export function createResource(body: {
  type: 'ARTICLE' | 'VIDEO';
  title: string;
  body?: string;
  url?: string;
  tags?: string[];
  published?: boolean;
}): Promise<ResourceItem> {
  return request<ResourceItem>('/resources', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
