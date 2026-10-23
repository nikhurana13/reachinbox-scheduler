'use client';
import { useEffect, useState } from 'react';
import { ComposeModal } from '@/components/ComposeModal';
import { Header } from '@/components/Header';
import { ScheduledTable } from '@/components/ScheduledTable';
import { SearchResults } from '@/components/SearchResults';
import { SentTable } from '@/components/SentTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import type { Tab } from '@/hooks/useEmails';
import { useMe } from '@/hooks/useMe';

export default function Dashboard() {
  const me = useMe();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('scheduled');
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Result of the Slack OAuth round trip arrives as ?slack=connected|error
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('slack');
    if (!s) return;
    toast(s === 'connected' ? 'success' : 'error', s === 'connected' ? 'Slack connected' : 'Slack connection failed. Try again.');
    window.history.replaceState(null, '', '/dashboard');
  }, [toast]);

  if (me.isLoading || !me.data) {
    return <div className="flex min-h-screen items-center justify-center text-ink-soft"><Spinner /></div>;
  }

  return (
    <>
      <Header me={me.data} />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input type="search" aria-label="Search emails" placeholder="Search recipient, subject or body" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button onClick={() => setComposing(true)}>Compose new email</Button>
        </div>

        {debounced ? (
          <SearchResults q={debounced} />
        ) : (
          <div className="space-y-4">
            <Tabs tabs={[{ id: 'scheduled', label: 'Scheduled' }, { id: 'sent', label: 'Sent' }]} value={tab} onChange={setTab} />
            {tab === 'scheduled' ? <ScheduledTable onCompose={() => setComposing(true)} /> : <SentTable />}
          </div>
        )}
      </main>
      <ComposeModal open={composing} onClose={() => setComposing(false)} />
    </>
  );
}
