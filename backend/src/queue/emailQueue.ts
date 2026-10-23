import { Queue } from 'bullmq';
import { connection } from './connection';
import { env } from '../config/env';

export const EMAIL_QUEUE = 'emails';

// BullMQ rejects custom ids containing ":" so we use "_" as the separator.
export const emailJobId = (emailId: string) => `email_${emailId}`;

export const emailQueue = new Queue(EMAIL_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: env.MAX_SEND_ATTEMPTS,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: false,
  },
});

export interface EmailJobInput {
  id: string;
  scheduledAt: Date;
}

export const toJob = (e: EmailJobInput) => ({
  name: 'send',
  data: { emailId: e.id },
  opts: { jobId: emailJobId(e.id), delay: Math.max(0, e.scheduledAt.getTime() - Date.now()) },
});

export async function enqueueEmails(emails: EmailJobInput[]) {
  // addBulk is idempotent for existing jobIds
  for (let i = 0; i < emails.length; i += 1000) {
    await emailQueue.addBulk(emails.slice(i, i + 1000).map(toJob));
  }
}
