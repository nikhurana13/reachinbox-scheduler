export type EmailStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';

export interface Me { id: string; name: string; email: string; avatarUrl: string | null }

export interface EmailRow {
  id: string;
  toEmail: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  previewUrl?: string | null;
  error?: string | null;
  attempts?: number;
}

export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }

export interface ScheduleRequest {
  subject: string;
  body: string;
  leads: string[];
  startTime: string;
  delayMs: number;
  hourlyLimit: number;
}
export interface ScheduleResponse { campaignId: string; scheduled: number; skipped: number; senders: number }

export interface SlackStatus { configured: boolean; connected: boolean; channel: string | null; teamName: string | null }
