import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { queryOne } from '@opsedge360/shared-db';
import {
  bootstrapTrustCa,
  buildSpiffeId,
  issueWorkloadSvid,
  materializeWorkloadFiles,
  mtlsEnabled,
} from '@opsedge360/shared-security';

/**
 * When MESH_AUTO_BOOTSTRAP=true (default with MTLS_ENABLED), ensure CA +
 * platform gateway/cmdb identities + SVIDs + materialize to SVID_DIR.
 */
@Injectable()
export class MeshBootstrapService implements OnModuleInit {
  private readonly log = new Logger(MeshBootstrapService.name);

  async onModuleInit() {
    const auto =
      process.env.MESH_AUTO_BOOTSTRAP === 'true' ||
      (mtlsEnabled() && process.env.MESH_AUTO_BOOTSTRAP !== 'false');
    if (!auto) return;
    try {
      await this.bootstrap();
    } catch (err) {
      this.log.warn(`Mesh auto-bootstrap skipped: ${(err as Error).message}`);
    }
  }

  private async bootstrap() {
    await bootstrapTrustCa(undefined, 'platform');
    const names = [
      process.env.MESH_GATEWAY_IDENTITY_NAME ?? 'api-gateway',
      process.env.MESH_CMDB_IDENTITY_NAME ?? 'cmdb',
    ];
    const svidIds: Array<{ name: string; svidId: string }> = [];
    for (const name of names) {
      let identity = await queryOne<{ id: string; spiffe_id: string | null }>(
        `SELECT id, spiffe_id FROM service_identities WHERE name = $1 AND tenant_id IS NULL LIMIT 1`,
        [name],
      );
      if (!identity) {
        identity = await queryOne<{ id: string; spiffe_id: string | null }>(
          `INSERT INTO service_identities (tenant_id, name, kind, scopes, status)
           VALUES (NULL, $1, 'service', ARRAY['*'], 'active')
           RETURNING id, spiffe_id`,
          [name],
        );
      }
      if (!identity) continue;
      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM workload_svids WHERE identity_id = $1 AND status = 'active' LIMIT 1`,
        [identity.id],
      );
      if (existing) {
        svidIds.push({ name, svidId: existing.id });
        continue;
      }
      const spiffeId = identity.spiffe_id ?? buildSpiffeId(name, 'platform');
      const issued = await issueWorkloadSvid({
        identityId: identity.id,
        spiffeId,
        tenantId: null,
        ttlSeconds: Number(process.env.SVID_TTL_SECONDS ?? 86400),
      });
      svidIds.push({ name, svidId: issued.svidId });
    }
    if (svidIds.length >= 2) {
      const written = await materializeWorkloadFiles(svidIds);
      this.log.log(`Mesh SVIDs materialized under ${written.dir}`);
    }
  }
}
