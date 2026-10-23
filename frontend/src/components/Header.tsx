'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Me } from '@/types/api';
import { ConnectSlack } from './ConnectSlack';
import { Button } from './ui/Button';

export function Header({ me }: { me: Me }) {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => { qc.clear(); router.replace('/login'); },
  });
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
        <span className="text-base font-semibold tracking-tight">ReachInbox Scheduler</span>
        <div className="flex items-center gap-3">
          <ConnectSlack />
          <div className="flex items-center gap-2.5">
            {me.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full" />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-sm font-semibold text-brand">{me.name.charAt(0)}</span>
            )}
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-medium">{me.name}</p>
              <p className="text-xs text-ink-soft">{me.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>Log out</Button>
        </div>
      </div>
    </header>
  );
}
