import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
const styles: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50',
  secondary: 'bg-card text-ink border border-line hover:bg-paper disabled:opacity-50',
  ghost: 'text-ink-soft hover:bg-black/5 disabled:opacity-50',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    />
  );
}
