import { Worker } from 'bullmq';
import { connection } from '../queue/connection';
import { INDEX_QUEUE } from '../queue/indexQueue';
import { indexEmail } from '../services/search';
import { logger } from '../config/logger';

export function startIndexWorker() {
  const worker = new Worker(INDEX_QUEUE, async (job) => indexEmail(job.data.emailId), {
    connection,
    concurrency: 10,
  });
  worker.on('failed', (job, err) => logger.warn({ jobId: job?.id, err: err.message }, 'index job failed'));
  return worker;
}
