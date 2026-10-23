import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

const base = 'w-full rounded-ctl border border-line bg-card px-3 text-sm placeholder:text-ink-faint focus:border-brand';

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-fail">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${base} h-9 ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${base} py-2 ${props.className ?? ''}`} />;
}
