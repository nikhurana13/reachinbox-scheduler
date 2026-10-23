import { Button } from './Button';
import { EmptyState } from './EmptyState';

export interface Column<T> { header: string; cell: (row: T) => React.ReactNode; className?: string }

interface Props<T extends { id: string }> {
  columns: Column<T>[];
  rows: T[] | undefined;
  loading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  empty: { title: string; body: string; action?: React.ReactNode };
  page?: number;
  pageSize?: number;
  total?: number;
  onPage?: (p: number) => void;
}

export function Table<T extends { id: string }>({ columns, rows, loading, error, onRetry, empty, page = 1, pageSize = 20, total = 0, onPage }: Props<T>) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-card">
      {error && !rows ? (
        <EmptyState title="Could not load emails" body={error.message} action={<Button variant="secondary" onClick={onRetry}>Try again</Button>} />
      ) : loading && !rows ? (
        <div className="divide-y divide-line" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-6 px-5 py-4">
              {columns.map((c, j) => <div key={j} className="h-4 flex-1 animate-pulse rounded bg-line" />)}
            </div>
          ))}
        </div>
      ) : rows && rows.length === 0 ? (
        <EmptyState {...empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs text-ink-soft">
              <tr>{columns.map((c) => <th key={c.header} className={`px-5 py-3 font-medium ${c.className ?? ''}`}>{c.header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows?.map((r) => (
                <tr key={r.id} className="hover:bg-paper/60">
                  {columns.map((c) => <td key={c.header} className={`px-5 py-3 ${c.className ?? ''}`}>{c.cell(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onPage && total > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-ink-soft">
          <span>Page {page} of {pages} · {total} emails</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
            <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
