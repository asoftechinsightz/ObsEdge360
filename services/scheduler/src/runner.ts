import { createLogger } from '@opsedge360/shared-logger';
import * as scheduler from './scheduler.service';

const log = createLogger('scheduler-runner');
let timer: ReturnType<typeof setInterval> | null = null;

export function startSchedulerRunner(): void {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const due = await scheduler.getDueJobs();
      for (const job of due) {
        const maxAttempts = job.retry_policy?.maxAttempts ?? 3;
        let attempt = 1;
        let lastError = '';

        while (attempt <= maxAttempts) {
          const run = await scheduler.startRun(job.id, attempt);
          try {
            const result = await scheduler.executeJob(job);
            await scheduler.completeRun(run.id, 'completed', result);
            await scheduler.scheduleNextRun(job);
            log.info('Job completed', { jobId: job.id, name: job.name });
            break;
          } catch (err) {
            lastError = (err as Error).message;
            await scheduler.completeRun(run.id, 'failed', {}, lastError);
            attempt += 1;
            if (attempt <= maxAttempts) {
              await new Promise((r) => setTimeout(r, job.retry_policy?.backoffMs ?? 5000));
            }
          }
        }

        if (attempt > maxAttempts) {
          await scheduler.moveToDeadLetter(job.id, job.payload, lastError, maxAttempts);
          await scheduler.scheduleNextRun(job);
          log.error('Job moved to dead letter', new Error(lastError), { jobId: job.id });
        }
      }
    } catch (err) {
      log.error('Scheduler runner tick failed', err as Error);
    }
  }, 15_000);
}

export function stopSchedulerRunner(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
