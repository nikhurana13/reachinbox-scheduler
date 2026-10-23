'use client';
import Papa from 'papaparse';
import { useCallback, useState } from 'react';

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export interface Leads { fileName: string; valid: string[]; skipped: number }

/** Parses a CSV/TXT client-side, pulls out every cell that looks like an address, dedupes. */
export function useCsvLeads() {
  const [leads, setLeads] = useState<Leads | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
      const tokens = parsed.data.flat().flatMap((cell) => String(cell).split(/[\s,;]+/)).map((t) => t.trim().toLowerCase()).filter(Boolean);
      const seen = new Set<string>();
      let skipped = 0;
      for (const t of tokens) {
        if (!EMAIL_RE.test(t) || seen.has(t)) { if (t.includes('@') || seen.has(t)) skipped++; continue; }
        seen.add(t);
      }
      setLeads({ fileName: file.name, valid: [...seen], skipped });
      if (seen.size === 0) setError('No email addresses found in this file.');
    } catch {
      setLeads(null);
      setError('Could not read this file. Use a .csv or .txt file.');
    }
  }, []);

  const clear = useCallback(() => { setLeads(null); setError(null); }, []);
  return { leads, error, load, clear };
}
