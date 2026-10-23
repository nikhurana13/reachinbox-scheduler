'use client';
import { createContext, useCallback, useContext, useState } from 'react';

type Kind = 'success' | 'error';
interface ToastItem { id: number; kind: Kind; text: string }
const Ctx = createContext<(kind: Kind, text: string) => void>(() => {});

export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: Kind, text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`rounded-ctl px-4 py-2.5 text-sm text-white shadow-lg ${t.kind === 'success' ? 'bg-sent' : 'bg-fail'}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
