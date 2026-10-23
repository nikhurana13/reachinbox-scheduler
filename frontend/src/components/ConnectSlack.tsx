'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';

export function ConnectSlack() {
  const qc = useQueryClient();
  const toast = useToast();
  const status = useQuery({ queryKey: ['slack'], queryFn: api.slackStatus });
  const disconnect = useMutation({
    mutationFn: api.slackDisconnect,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['slack'] }); toast('success', 'Slack disconnected'); },
    onError: (e: Error) => toast('error', e.message),
  });

  if (!status.data) return null;
  if (status.data.connected) {
    return (
      <Button variant="secondary" onClick={() => disconnect.mutate()} disabled={disconnect.isPending} title="Disconnect Slack">
        <span className="h-2 w-2 rounded-full bg-sent" /> Slack{status.data.channel ? ` ${status.data.channel}` : ' connected'}
      </Button>
    );
  }
  return (
    <a
      href={status.data.configured ? '/api/slack/install' : undefined}
      aria-disabled={!status.data.configured}
      title={status.data.configured ? undefined : 'Slack credentials are not set on the server'}
      className={`inline-flex h-9 items-center rounded-ctl border border-line bg-card px-4 text-sm font-medium ${status.data.configured ? 'hover:bg-paper' : 'cursor-not-allowed opacity-50'}`}
    >
      Connect Slack
    </a>
  );
}
