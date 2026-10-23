import type { EmailRow, Me, Page, ScheduleRequest, ScheduleResponse, SlackStatus } from '@/types/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  me: () => request<Me>('/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  scheduled: (page: number) => request<Page<EmailRow>>(`/emails/scheduled?page=${page}`),
  sent: (page: number) => request<Page<EmailRow>>(`/emails/sent?page=${page}`),
  search: (q: string) => request<{ items: EmailRow[] }>(`/emails/search?q=${encodeURIComponent(q)}`),
  schedule: (body: ScheduleRequest) => request<ScheduleResponse>('/emails/schedule', { method: 'POST', body: JSON.stringify(body) }),
  slackStatus: () => request<SlackStatus>('/slack/status'),
  slackDisconnect: () => request<{ ok: true }>('/slack/disconnect', { method: 'DELETE' }),
};
