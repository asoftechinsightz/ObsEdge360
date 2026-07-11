export type SchedulerTask = () => void | Promise<void>;

export interface ScheduledJob {
  id: string;
  intervalMs: number;
  task: SchedulerTask;
  timer?: ReturnType<typeof setInterval>;
}

/** Lightweight scheduling engine for heartbeat, inventory, config, collectors. */
export class AgentScheduler {
  private readonly jobs = new Map<string, ScheduledJob>();

  schedule(id: string, intervalMs: number, task: SchedulerTask, runImmediately = true): void {
    this.cancel(id);
    const job: ScheduledJob = { id, intervalMs, task };
    job.timer = setInterval(() => {
      Promise.resolve(task()).catch(() => undefined);
    }, intervalMs);
    this.jobs.set(id, job);
    if (runImmediately) Promise.resolve(task()).catch(() => undefined);
  }

  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (job?.timer) clearInterval(job.timer);
    this.jobs.delete(id);
  }

  reschedule(id: string, intervalMs: number): void {
    const job = this.jobs.get(id);
    if (!job) return;
    this.schedule(id, intervalMs, job.task, false);
  }

  list(): Array<{ id: string; intervalMs: number }> {
    return [...this.jobs.values()].map((j) => ({ id: j.id, intervalMs: j.intervalMs }));
  }

  stopAll(): void {
    for (const id of [...this.jobs.keys()]) this.cancel(id);
  }
}
