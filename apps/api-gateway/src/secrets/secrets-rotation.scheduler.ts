import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { countExpiringSecrets, createSecretsProvider, incSecurityMetric } from '@opsedge360/shared-security';
import { query } from '@opsedge360/shared-db';

/** Secret expiry monitoring + optional auto-rotation jobs (Wave 6 productization) */
@Injectable()
export class SecretsRotationScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;
  private secrets = createSecretsProvider(process.env.SECRETS_PROVIDER);

  onModuleInit() {
    if (process.env.SECRETS_ROTATION_SCHEDULER === 'false') return;
    const ms = Number(process.env.SECRETS_ROTATION_INTERVAL_MS ?? 300_000);
    this.timer = setInterval(() => {
      void this.tick();
    }, ms);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    try {
      const expiring = await countExpiringSecrets(30);
      if (expiring > 0) {
        incSecurityMetric('security.secrets.expiring', expiring);
      }

      // Productized jobs: notify + optional auto_rotate
      const jobs = await query<{
        id: string;
        tenant_id: string;
        secret_id: string;
        notify_before_days: number;
        auto_rotate: boolean;
      }>(
        `SELECT id, tenant_id, secret_id, notify_before_days, auto_rotate
         FROM secret_rotation_jobs WHERE enabled = true LIMIT 100`,
      ).catch(() => []);

      for (const job of jobs) {
        const meta = await this.secrets.getMetadata(job.tenant_id, job.secret_id).catch(() => null);
        if (!meta) continue;
        if (meta.expires_at) {
          const days = (new Date(meta.expires_at).getTime() - Date.now()) / 86400000;
          if (days <= job.notify_before_days) {
            await query(
              `INSERT INTO secret_rotation_events (tenant_id, job_id, secret_id, event_type, detail)
               VALUES ($1,$2,$3,'expiry.warning',$4::jsonb)`,
              [
                job.tenant_id,
                job.id,
                job.secret_id,
                JSON.stringify({ daysRemaining: Math.floor(days), source: 'scheduler' }),
              ],
            ).catch(() => undefined);
          }
        }
        if (job.auto_rotate && process.env.SECRETS_AUTO_ROTATE === 'true') {
          // Only when explicitly enabled at platform level — never silent production rotation
          const newValue = `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          try {
            const rotated = await this.secrets.rotate(job.tenant_id, job.secret_id, newValue, 'scheduler');
            await query(
              `UPDATE secret_rotation_jobs SET last_rotated_at=NOW(), last_status='rotated', last_error=NULL, updated_at=NOW()
               WHERE id=$1`,
              [job.id],
            );
            await query(
              `INSERT INTO secret_rotation_events (tenant_id, job_id, secret_id, event_type, detail)
               VALUES ($1,$2,$3,'rotated',$4::jsonb)`,
              [job.tenant_id, job.id, job.secret_id, JSON.stringify({ version: rotated.current_version, source: 'scheduler' })],
            );
            incSecurityMetric('security.secrets.rotated', 1);
          } catch (e) {
            await query(
              `UPDATE secret_rotation_jobs SET last_status='failed', last_error=$2, updated_at=NOW() WHERE id=$1`,
              [job.id, (e as Error).message],
            ).catch(() => undefined);
          }
        }
      }
    } catch {
      // never crash process
    }
  }
}
