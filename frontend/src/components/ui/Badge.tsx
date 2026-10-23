import type { EmailStatus } from '@/types/api';

const map: Record<EmailStatus, { label: string; cls: string }> = {
  SCHEDULED: { label: 'Scheduled', cls: 'bg-brand-tint text-brand' },
  SENDING: { label: 'Sending', cls: 'bg-wait-tint text-wait' },
  SENT: { label: 'Sent', cls: 'bg-sent-tint text-sent' },
  FAILED: { label: 'Failed', cls: 'bg-fail-tint text-fail' },
};

export function StatusBadge({ status }: { status: EmailStatus }) {
  const s = map[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
