'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, ApiError } from '@/lib/api';

/** Guards a page: redirects to /login when there is no session. */
export function useMe() {
  const router = useRouter();
  const q = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });
  useEffect(() => {
    if (q.error instanceof ApiError && q.error.status === 401) router.replace('/login');
  }, [q.error, router]);
  return q;
}
