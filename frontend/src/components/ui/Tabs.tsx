export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${value === t.id ? 'border-brand text-ink' : 'border-transparent text-ink-soft hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
