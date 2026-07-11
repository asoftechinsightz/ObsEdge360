import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { countExpiringSecrets, incSecurityMetric } from '@opsedge360/shared-security';

/** Expiry / rotation monitoring — Wave 4 ops foundation */
@Injectable()
export class SecretsRotationScheduler implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

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
    } catch {
      // never crash process
    }
  }
}
