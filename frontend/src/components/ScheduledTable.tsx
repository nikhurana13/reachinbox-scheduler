'use client';
import { useState } from 'react';
import { useEmails } from '@/hooks/useEmails';
import { formatDateTime } from '@/lib/format';
import { StatusBadge } from './ui/Badge';
import { Table } from './ui/Table';

export function ScheduledTable({ onCompose }: { onCompose: () => void }) {
  const [page, setPage] = useState(1);
  const q = useEmails('scheduled', page);
  return (
    <Table
      columns={[
        { header: 'Recipient', cell: (r) => r.toEmail },
        { header: 'Subject', cell: (r) => <span className="line-clamp-1">{r.subject}</span>, className: 'max-w-xs' },
        { header: 'Scheduled for', cell: (r) => formatDateTime(r.scheduledAt), className: 'whitespace-nowrap' },
        { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
      ]}
      rows={q.data?.items}
      loading={q.isLoading}
      error={q.error}
      onRetry={() => q.refetch()}
      empty={{
        title: 'Nothing scheduled',
        body: 'Upload a list of recipients and pick a start time. Emails will appear here until they are sent.',
        action: <button onClick={onCompose} className="text-sm font-medium text-brand hover:underline">Compose new email</button>,
      }}
      page={page}
      pageSize={q.data?.pageSize}
      total={q.data?.total}
      onPage={setPage}
    />
  );
}
