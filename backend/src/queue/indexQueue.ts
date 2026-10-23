import { Queue } from 'bullmq';
import { connection } from './connection';

export const INDEX_QUEUE = 'email-index';

export const indexQueue = new Queue(INDEX_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { age: 600 },
    removeOnFail: { age: 86400 },
  },
});

export const enqueueIndex = (emailId: string) => indexQueue.add('index', { emailId });
