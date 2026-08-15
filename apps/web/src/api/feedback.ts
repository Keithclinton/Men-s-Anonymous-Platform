import { request } from './client';
import type { Feedback } from './types';

export function submitFeedback(
  sessionId: string,
  body: { rating: number; comment?: string },
): Promise<Feedback> {
  return request<Feedback>(`/sessions/${sessionId}/feedback`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listProviderFeedback(): Promise<Feedback[]> {
  return request<Feedback[]>('/providers/me/feedback');
}
