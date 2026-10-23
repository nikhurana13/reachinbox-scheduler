'use client';
import { useState } from 'react';
import { useEmails } from '@/hooks/useEmails';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from './ui/Badge';
import { Table } from './ui/Table';

export function SentTable() {
  const [page, setPage] = useState(1);
  const q = useEmails('sent', page);
  return (
    <Table
      columns={[
        { header: 'Recipient', cell: (r) => r.toEmail },
        { header: 'Subject', cell: (r) => <span className="line-clamp-1">{r.subject}</span>, className: 'max-w-xs' },
        { header: 'Sent', cell: (r) => formatDateTime(r.sentAt), className: 'whitespace-nowrap' },
        { header: 'Status', cell: (r) => <span title={r.error ?? undefined}><StatusBadge status={r.status} /></span> },
        {
          header: 'Preview',
          cell: (r) => r.previewUrl ? <a href={r.previewUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">Open</a> : <span className="text-ink-faint">-</span>,
        },
      ]}
      rows={q.data?.items}
      loading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      empty={{ title: 'No sent emails yet', body: 'Emails move here once they have been delivered or have failed.' }}
      page={page}
      pageSize={q.data?.pageSize}
      total={q.data?.total}
      onPage={setPage}
    />
  );
}
