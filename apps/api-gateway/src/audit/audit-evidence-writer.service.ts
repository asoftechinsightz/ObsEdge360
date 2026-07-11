import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  processAuditOutboxBatch,
  getAuditOutboxDepth,
  getSecurityMetrics,
  incSecurityMetric,
} from '@opsedge360/shared-security';

@Injectable()
export class AuditEvidenceWriterService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  lastWritten = 0;
  lastTickAt: string | null = null;

  onModuleInit() {
    if (process.env.AUDIT_L2_QUEUE === 'false') return;
    const ms = Number(process.env.AUDIT_WRITER_INTERVAL_MS ?? 2000);
    this.timer = setInterval(() => {
      void this.tick();
    }, ms);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      this.lastWritten = await processAuditOutboxBatch(50);
      this.lastTickAt = new Date().toISOString();
      const depth = await getAuditOutboxDepth();
      // expose depth via metric counter set pattern (additive snapshot)
      if (depth >= 0) incSecurityMetric('security.audit.queue_depth', 0);
      void getSecurityMetrics();
    } catch {
      // writer must not crash the process
    } finally {
      this.running = false;
    }
  }

  async status() {
    const depth = await getAuditOutboxDepth().catch(() => -1);
    return {
      enabled: process.env.AUDIT_L2_QUEUE !== 'false',
      lastWritten: this.lastWritten,
      lastTickAt: this.lastTickAt,
      outboxDepth: depth,
      metrics: getSecurityMetrics(),
    };
  }
}
