'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCsvLeads } from '@/hooks/useCsvLeads';
import { api } from '@/lib/api';
import { toLocalInput } from '@/lib/format';
import { Button } from './ui/Button';
import { Field, Input, Textarea } from './ui/Input';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { useToast } from './ui/Toast';

const DEFAULTS = { subject: '', body: '', delaySec: 2, hourlyLimit: 100 };

export function ComposeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const { leads, error: fileError, load, clear } = useCsvLeads();
  const [form, setForm] = useState(DEFAULTS);
  const [start, setStart] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setStart(toLocalInput(new Date(Date.now() + 5 * 60_000))); setTouched(false); }
  }, [open]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = 'Add a subject';
    if (!form.body.trim()) e.body = 'Write the message body';
    if (!leads?.valid.length) e.leads = 'Upload a CSV or TXT with at least one email address';
    if (!start || Number.isNaN(new Date(start).getTime())) e.start = 'Pick a start time';
    if (!(form.delaySec >= 0)) e.delay = 'Delay cannot be negative';
    if (!(form.hourlyLimit >= 1)) e.limit = 'Limit must be at least 1';
    return e;
  }, [form, leads, start]);

  const schedule = useMutation({
    mutationFn: () =>
      api.schedule({
        subject: form.subject.trim(),
        body: form.body.trim(),
        leads: leads!.valid,
        startTime: new Date(start).toISOString(),
        delayMs: Math.round(form.delaySec * 1000),
        hourlyLimit: form.hourlyLimit,
      }),
    onSuccess: (r) => {
      toast('success', `Scheduled ${r.scheduled} email${r.scheduled === 1 ? '' : 's'}`);
      qc.invalidateQueries({ queryKey: ['emails'] });
      setForm(DEFAULTS); clear(); onClose();
    },
    onError: (e: Error) => toast('error', e.message),
  });

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length === 0) schedule.mutate();
  };
  const show = (k: string) => (touched ? errors[k] : undefined);

  return (
    <Modal open={open} title="Compose new email" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Subject" error={show('subject')}>
          <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Quick question about your onboarding" />
        </Field>
        <Field label="Message" error={show('body')}>
          <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the email body" />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium">Recipients</span>
          <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
          <div className="flex items-center gap-3 rounded-ctl border border-dashed border-line px-3 py-3">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>{leads ? 'Replace file' : 'Upload CSV or TXT'}</Button>
            <div className="min-w-0 text-sm">
              {leads ? (
                <>
                  <p className="truncate font-medium">{leads.fileName}</p>
                  <p className="text-ink-soft"><span className="font-medium text-sent">{leads.valid.length} valid emails detected</span>{leads.skipped > 0 && `, ${leads.skipped} skipped (invalid or duplicate)`}</p>
                </>
              ) : <p className="text-ink-soft">Any column works. We pick out the addresses.</p>}
            </div>
          </div>
          {(fileError || show('leads')) && <p className="mt-1 text-xs text-fail">{fileError ?? show('leads')}</p>}
        </div>

        <Field label="Start time" error={show('start')}>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Delay between emails (seconds)" error={show('delay')}>
            <Input type="number" min={0} step={1} value={form.delaySec} onChange={(e) => setForm({ ...form, delaySec: Number(e.target.value) })} />
          </Field>
          <Field label="Hourly limit per sender" error={show('limit')}>
            <Input type="number" min={1} value={form.hourlyLimit} onChange={(e) => setForm({ ...form, hourlyLimit: Number(e.target.value) })} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={schedule.isPending}>
            {schedule.isPending && <Spinner />} Schedule{leads ? ` ${leads.valid.length} email${leads.valid.length === 1 ? '' : 's'}` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
