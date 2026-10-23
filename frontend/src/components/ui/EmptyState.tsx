export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-ink-soft">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
