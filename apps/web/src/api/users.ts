import { request } from './client';
import type { MeResponse } from './types';

export function getMe(): Promise<MeResponse> {
  return request<MeResponse>('/users/me');
}
