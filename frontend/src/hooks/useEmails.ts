'use client';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type Tab = 'scheduled' | 'sent';

/** Polls every 10s; only the visible tab's query is mounted. */
export function useEmails(tab: Tab, page: number) {
  return useQuery({
    queryKey: ['emails', tab, page],
    queryFn: () => (tab === 'scheduled' ? api.scheduled(page) : api.sent(page)),
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search(q),
    enabled: q.length > 0,
  });
}
