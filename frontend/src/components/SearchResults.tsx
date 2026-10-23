'use client';
import { useSearch } from '@/hooks/useEmails';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from './ui/Badge';
import { Table } from './ui/Table';

export function SearchResults({ q }: { q: string }) {
  const s = useSearch(q);
  return (
    <Table
      columns={[
        { header: 'Recipient', cell: (r) => r.toEmail },
        { header: 'Subject', cell: (r) => <span className="line-clamp-1">{r.subject}</span>, className: 'max-w-xs' },
        { header: 'Time', cell: (r) => formatDateTime(r.sentAt ?? r.scheduledAt), className: 'whitespace-nowrap' },
        { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
      ]}
      rows={s.data?.items}
      loading={s.isLoading}
      error={s.error}
      onRetry={() => s.refetch()}
      empty={{ title: `No matches for "${q}"`, body: 'Search covers recipient, subject and body. Try a different word.' }}
    />
  );
}
