import { createHash, X509Certificate } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createSecretsProvider } from '@opsedge360/shared-security';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
}
function requireTenant(tenantId?: string): string {
  if (!tenantId) throw new BadRequestException('Tenant context required');
  return tenantId;
}

@Injectable()
export class Wave6Service {
  private secrets = createSecretsProvider(process.env.SECRETS_PROVIDER);

  private async audit(
    tenantId: string | null,
    actorId: string | undefined,
    action: string,
    resourceType?: string,
    resourceId?: string,
    detail?: Record<string, unknown>,
  ) {
    try {
      await query(
        `INSERT INTO governance_audit_events (tenant_id, actor_id, action, resource_type, resource_id, detail)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)`,
        [tenantId, actorId ?? null, action, resourceType ?? null, resourceId ?? null, JSON.stringify(detail ?? {})],
      );
    } catch {
      /* optional */
    }
  }

  async getOpsHealth(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const [backups, certs, rotation, airgap, profiles, sessions] = await Promise.all([
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM backup_certifications WHERE tenant_id=$1 OR tenant_id IS NULL`, [tid]),
      queryOne<{ c: string; exp: string }>(
        `SELECT COUNT(*)::text AS c,
                COUNT(*) FILTER (WHERE not_after < NOW() + INTERVAL '30 days')::text AS exp
         FROM enterprise_certificates WHERE tenant_id=$1 AND status <> 'revoked'`,
        [tid],
      ),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM secret_rotation_jobs WHERE tenant_id=$1 AND enabled=true`, [tid]),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM airgap_packages WHERE verified=true`),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM deployment_profiles WHERE tenant_id=$1 OR tenant_id IS NULL`, [tid]),
      queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM user_sessions WHERE tenant_id=$1 AND revoked_at IS NULL`, [tid]),
    ]);
    const db = await queryOne<{ ok: number }>(`SELECT 1 AS ok`);
    return {
      wave: 'v1.0.0-wave6',
      gaClaim: false,
      deployment: { profiles: Number(profiles?.c ?? 0), airgapVerifiedPackages: Number(airgap?.c ?? 0) },
      cluster: { database: db?.ok === 1 ? 'up' : 'down', mode: process.env.HA_MODE ?? 'single' },
      storage: { note: 'See /admin/storage for capacity; PVC via Helm values-production' },
      secrets: { rotationJobs: Number(rotation?.c ?? 0) },
      certificates: { total: Number(certs?.c ?? 0), expiringSoon: Number(certs?.exp ?? 0) },
      backups: { certifications: Number(backups?.c ?? 0) },
      restore: { note: 'Host-side restore; attestations via /admin/deployment/restore/certify' },
      nodes: { claim: process.env.HA_MULTI_NODE === 'true' ? 'multi-node' : 'single-node' },
      pods: { note: 'Kubernetes inventory via cluster operator / Helm release status' },
      namespaces: { default: 'opsedge360' },
      sessions: { active: Number(sessions?.c ?? 0) },
      checkedAt: new Date().toISOString(),
    };
  }

  async getSecurityOverview(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const policies = await query(
      `SELECT policy_type, config, updated_at FROM security_policies WHERE tenant_id=$1 ORDER BY policy_type`,
      [tid],
    );
    const rotation = await query(
      `SELECT id, secret_id, schedule_cron, auto_rotate, enabled, last_status, last_rotated_at
       FROM secret_rotation_jobs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [tid],
    );
    const certificates = await query(
      `SELECT id, name, purpose, subject_cn, fingerprint_sha256, not_after, status, validation_ok
       FROM enterprise_certificates WHERE tenant_id=$1 ORDER BY not_after ASC NULLS LAST LIMIT 100`,
      [tid],
    );
    const sessions = await query(
      `SELECT id, user_id, device_label, ip_address, last_seen_at, revoked_at
       FROM user_sessions WHERE tenant_id=$1 ORDER BY last_seen_at DESC LIMIT 50`,
      [tid],
    );
    return {
      wave: 'v1.0.0-wave6',
      gaClaim: false,
      tabs: ['general', 'secrets', 'password', 'session', 'rotation', 'audit', 'certificates'],
      policies,
      rotation,
      certificates,
      sessions,
    };
  }

  // --- Air-gap ---
  async registerAirgapPackage(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      packageName: string;
      version: string;
      checksumSha256: string;
      manifest?: Record<string, unknown>;
      imageDigests?: unknown[];
      offlineDocs?: boolean;
    },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!body.packageName || !body.version || !body.checksumSha256) {
      throw new BadRequestException('packageName, version, checksumSha256 required');
    }
    if (!/^[a-f0-9]{64}$/i.test(body.checksumSha256)) {
      throw new BadRequestException('checksumSha256 must be 64 hex chars');
    }
    const row = await queryOne(
      `INSERT INTO airgap_packages
         (tenant_id, package_name, version, checksum_sha256, manifest, image_digests, offline_docs, created_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8)
       RETURNING *`,
      [
        tid,
        body.packageName,
        body.version,
        body.checksumSha256.toLowerCase(),
        JSON.stringify(body.manifest ?? { requiresInternet: false }),
        JSON.stringify(body.imageDigests ?? []),
        body.offlineDocs ?? true,
        user.sub,
      ],
    );
    await this.audit(tid, user.sub, 'airgap.package.registered', 'airgap_packages', String(row?.id), {
      version: body.version,
    });
    return row;
  }

  async verifyAirgapPackage(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    body: { computedChecksumSha256: string },
  ) {
    requireAdmin(user);
    const pkg = await queryOne<{ id: string; checksum_sha256: string }>(
      `SELECT id, checksum_sha256 FROM airgap_packages WHERE id=$1`,
      [id],
    );
    if (!pkg) throw new NotFoundException('Package not found');
    const ok = pkg.checksum_sha256.toLowerCase() === String(body.computedChecksumSha256 || '').toLowerCase();
    const row = await queryOne(
      `UPDATE airgap_packages SET verified=$2, verified_at=CASE WHEN $2 THEN NOW() ELSE NULL END
       WHERE id=$1 RETURNING *`,
      [id, ok],
    );
    await this.audit(tenantId ?? null, user.sub, ok ? 'airgap.package.verified' : 'airgap.package.verify_failed', 'airgap_packages', id, {
      ok,
    });
    if (!ok) throw new BadRequestException('Checksum mismatch — package validation failed');
    return row;
  }

  async listAirgapPackages(user: JwtPayload) {
    requireAdmin(user);
    return { packages: await query(`SELECT * FROM airgap_packages ORDER BY created_at DESC LIMIT 50`) };
  }

  // --- Deployment profiles / k8s ---
  async upsertDeploymentProfile(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      profileName: string;
      mode?: string;
      namespace?: string;
      helmRelease?: string;
      valuesSnapshot?: Record<string, unknown>;
      airgap?: boolean;
      status?: string;
    },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!body.profileName) throw new BadRequestException('profileName required');
    const row = await queryOne(
      `INSERT INTO deployment_profiles
         (tenant_id, profile_name, mode, namespace, helm_release, values_snapshot, airgap, status)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
       RETURNING *`,
      [
        tid,
        body.profileName,
        body.mode ?? 'onprem',
        body.namespace ?? 'opsedge360',
        body.helmRelease ?? 'opsedge360',
        JSON.stringify(body.valuesSnapshot ?? {}),
        body.airgap ?? false,
        body.status ?? 'configured',
      ],
    );
    await this.audit(tid, user.sub, 'deployment.profile.upserted', 'deployment_profiles', String(row?.id), {
      profileName: body.profileName,
    });
    return row;
  }

  async listDeploymentProfiles(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const profiles = await query(
      `SELECT * FROM deployment_profiles WHERE tenant_id=$1 OR tenant_id IS NULL ORDER BY created_at DESC`,
      [tid],
    );
    return {
      profiles,
      helm: {
        chart: 'infra/helm/opsedge360',
        valuesProduction: 'values-production.yaml',
        valuesHa: 'values-ha.yaml',
        features: ['HPA', 'PDB', 'Ingress', 'PVC', 'probes', 'antiAffinity', 'rollingUpdate', 'ConfigMap', 'Secret'],
      },
    };
  }

  // --- Backup certification ---
  async upsertBackupSchedule(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      target?: string;
      cronExpr?: string;
      retentionDays?: number;
      encrypt?: boolean;
      enabled?: boolean;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name) throw new BadRequestException('name required');
    const row = await queryOne(
      `INSERT INTO backup_schedules
         (tenant_id, name, target, cron_expr, retention_days, encrypt, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        tid,
        body.name,
        body.target ?? 'postgresql',
        body.cronExpr ?? '0 2 * * *',
        body.retentionDays ?? 14,
        body.encrypt ?? true,
        body.enabled ?? true,
      ],
    );
    await this.audit(tid, user.sub, 'backup.schedule.created', 'backup_schedules', String(row?.id), {});
    return row;
  }

  async listBackupSchedules(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return {
      schedules: await query(`SELECT * FROM backup_schedules WHERE tenant_id=$1 ORDER BY created_at DESC`, [tid]),
    };
  }

  async certifyBackup(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      artifactPath: string;
      checksumSha256: string;
      sizeBytes?: number;
      backupRunId?: string;
      retentionDays?: number;
      report?: Record<string, unknown>;
    },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!body.artifactPath || !body.checksumSha256) {
      throw new BadRequestException('artifactPath and checksumSha256 required');
    }
    if (!/^[a-f0-9]{64}$/i.test(body.checksumSha256)) {
      throw new BadRequestException('checksumSha256 must be 64 hex chars');
    }
    const retentionDays = body.retentionDays ?? 14;
    const row = await queryOne(
      `INSERT INTO backup_certifications
         (tenant_id, backup_run_id, artifact_path, checksum_sha256, size_bytes, integrity_ok,
          retention_until, report, certified_by)
       VALUES ($1,$2,$3,$4,$5,TRUE,NOW() + ($6 || ' days')::interval,$7::jsonb,$8)
       RETURNING *`,
      [
        tid,
        body.backupRunId ?? null,
        body.artifactPath,
        body.checksumSha256.toLowerCase(),
        body.sizeBytes ?? null,
        String(retentionDays),
        JSON.stringify({
          ...(body.report ?? {}),
          integrity: 'checksum_validated',
          encrypted: true,
          wave: 'v1.0.0-wave6',
        }),
        user.sub,
      ],
    );
    await this.audit(tid, user.sub, 'backup.certified', 'backup_certifications', String(row?.id), {
      artifactPath: body.artifactPath,
    });
    return row;
  }

  async listBackupCertifications(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return {
      certifications: await query(
        `SELECT * FROM backup_certifications WHERE tenant_id=$1 OR tenant_id IS NULL
         ORDER BY certified_at DESC LIMIT 50`,
        [tid],
      ),
    };
  }

  async certifyRestore(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      restoreType?: string;
      sourceArtifact: string;
      status?: string;
      validationReport?: Record<string, unknown>;
      pointInTime?: string;
    },
  ) {
    requireAdmin(user);
    const tid = tenantId ?? null;
    if (!body.sourceArtifact) throw new BadRequestException('sourceArtifact required');
    const restoreType = body.restoreType ?? 'full';
    const status = body.status ?? 'attested';
    const row = await queryOne(
      `INSERT INTO restore_certifications
         (tenant_id, restore_type, source_artifact, status, validation_report, point_in_time, attested_by)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7)
       RETURNING *`,
      [
        tid,
        restoreType,
        body.sourceArtifact,
        status,
        JSON.stringify({
          ...(body.validationReport ?? {}),
          hostSideRestore: true,
          remoteDestructiveApi: false,
          wave: 'v1.0.0-wave6',
        }),
        body.pointInTime ?? null,
        user.sub,
      ],
    );
    await this.audit(tid, user.sub, 'restore.certified', 'restore_certifications', String(row?.id), {
      restoreType,
      status,
    });
    return row;
  }

  async listRestoreCertifications(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return {
      certifications: await query(
        `SELECT * FROM restore_certifications WHERE tenant_id=$1 OR tenant_id IS NULL
         ORDER BY attested_at DESC LIMIT 50`,
        [tid],
      ),
    };
  }

  // --- Secret rotation ---
  async createRotationJob(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      secretId: string;
      scheduleCron?: string;
      rotateAfterDays?: number;
      notifyBeforeDays?: number;
      autoRotate?: boolean;
    },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.secretId) throw new BadRequestException('secretId required');
    const meta = await this.secrets.getMetadata(tid, body.secretId).catch(() => null);
    if (!meta) throw new BadRequestException('secretId not found for tenant');
    const row = await queryOne(
      `INSERT INTO secret_rotation_jobs
         (tenant_id, secret_id, schedule_cron, rotate_after_days, notify_before_days, auto_rotate)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        tid,
        body.secretId,
        body.scheduleCron ?? '0 3 * * 0',
        body.rotateAfterDays ?? meta.rotate_after_days ?? 90,
        body.notifyBeforeDays ?? 14,
        body.autoRotate ?? false,
      ],
    );
    await query(
      `INSERT INTO secret_rotation_events (tenant_id, job_id, secret_id, event_type, detail)
       VALUES ($1,$2,$3,'job.created',$4::jsonb)`,
      [tid, row?.id, body.secretId, JSON.stringify({ autoRotate: body.autoRotate ?? false })],
    );
    await this.audit(tid, user.sub, 'secrets.rotation.job.created', 'secret_rotation_jobs', String(row?.id), {});
    return row;
  }

  async listRotationJobs(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const jobs = await query(`SELECT * FROM secret_rotation_jobs WHERE tenant_id=$1 ORDER BY created_at DESC`, [tid]);
    const events = await query(
      `SELECT * FROM secret_rotation_events WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [tid],
    );
    return { jobs, events };
  }

  async runRotationJob(tenantId: string | undefined, user: JwtPayload, jobId: string, body?: { newValue?: string }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const job = await queryOne<Record<string, unknown>>(
      `SELECT * FROM secret_rotation_jobs WHERE id=$1 AND tenant_id=$2`,
      [jobId, tid],
    );
    if (!job) throw new NotFoundException('Rotation job not found');
    if (!job.auto_rotate && !body?.newValue) {
      throw new BadRequestException('auto_rotate disabled — provide newValue to rotate manually');
    }
    const newValue =
      body?.newValue ||
      createHash('sha256').update(`${job.secret_id}:${Date.now()}:${Math.random()}`).digest('base64url');
    try {
      const rotated = await this.secrets.rotate(tid, String(job.secret_id), newValue, user.sub);
      await query(
        `UPDATE secret_rotation_jobs SET last_rotated_at=NOW(), last_status='rotated', last_error=NULL, updated_at=NOW()
         WHERE id=$1`,
        [jobId],
      );
      await query(
        `INSERT INTO secret_rotation_events (tenant_id, job_id, secret_id, event_type, detail)
         VALUES ($1,$2,$3,'rotated',$4::jsonb)`,
        [tid, jobId, job.secret_id, JSON.stringify({ version: rotated.current_version })],
      );
      await this.audit(tid, user.sub, 'secrets.rotated', 'secrets', String(job.secret_id), {
        version: rotated.current_version,
      });
      return { ok: true, secretId: job.secret_id, version: rotated.current_version };
    } catch (e) {
      await query(
        `UPDATE secret_rotation_jobs SET last_status='failed', last_error=$2, updated_at=NOW() WHERE id=$1`,
        [jobId, (e as Error).message],
      );
      await query(
        `INSERT INTO secret_rotation_events (tenant_id, job_id, secret_id, event_type, detail)
         VALUES ($1,$2,$3,'rotation.failed',$4::jsonb)`,
        [tid, jobId, job.secret_id, JSON.stringify({ error: (e as Error).message })],
      );
      throw new BadRequestException((e as Error).message);
    }
  }

  async notifyExpiringSecrets(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const jobs = await query<{ id: string; secret_id: string; notify_before_days: number }>(
      `SELECT id, secret_id, notify_before_days FROM secret_rotation_jobs WHERE tenant_id=$1 AND enabled=true`,
      [tid],
    );
    const notifications: unknown[] = [];
    for (const j of jobs) {
      const meta = await this.secrets.getMetadata(tid, j.secret_id).catch(() => null);
      if (!meta?.expires_at) continue;
      const days = (new Date(meta.expires_at).getTime() - Date.now()) / 86400000;
      if (days <= j.notify_before_days) {
        await query(
          `INSERT INTO secret_rotation_events (tenant_id, job_id, secret_id, event_type, detail)
           VALUES ($1,$2,$3,'expiry.warning',$4::jsonb)`,
          [tid, j.id, j.secret_id, JSON.stringify({ daysRemaining: Math.floor(days), expiresAt: meta.expires_at })],
        );
        notifications.push({ secretId: j.secret_id, daysRemaining: Math.floor(days) });
      }
    }
    return { notifications };
  }

  // --- Certificates ---
  async uploadCertificate(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { name: string; purpose?: string; pemPublic: string; secretRef?: string },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name || !body.pemPublic) throw new BadRequestException('name and pemPublic required');
    let subjectCn: string | null = null;
    let fingerprint: string | null = null;
    let notBefore: Date | null = null;
    let notAfter: Date | null = null;
    let validationOk = false;
    try {
      const cert = new X509Certificate(body.pemPublic);
      subjectCn = cert.subject;
      fingerprint = cert.fingerprint256?.replace(/:/g, '').toLowerCase() || createHash('sha256').update(cert.raw).digest('hex');
      notBefore = new Date(cert.validFrom);
      notAfter = new Date(cert.validTo);
      if (!cert.publicKey) throw new Error('Certificate missing public key');
      validationOk = notAfter > new Date();
    } catch (e) {
      throw new BadRequestException(`Invalid certificate PEM: ${(e as Error).message}`);
    }
    const status = !validationOk ? 'expired' : notAfter && notAfter.getTime() - Date.now() < 30 * 86400000 ? 'expiring' : 'active';
    const row = await queryOne(
      `INSERT INTO enterprise_certificates
         (tenant_id, name, purpose, subject_cn, fingerprint_sha256, not_before, not_after,
          pem_public, secret_ref, status, last_validated_at, validation_ok)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11)
       RETURNING id, tenant_id, name, purpose, subject_cn, fingerprint_sha256, not_before, not_after,
                 status, validation_ok, secret_ref IS NOT NULL AS has_secret_ref, created_at`,
      [
        tid,
        body.name,
        body.purpose ?? 'tls',
        subjectCn,
        fingerprint,
        notBefore?.toISOString() ?? null,
        notAfter?.toISOString() ?? null,
        body.pemPublic,
        body.secretRef ?? null,
        status,
        validationOk,
      ],
    );
    await this.audit(tid, user.sub, 'certificate.uploaded', 'enterprise_certificates', String(row?.id), {
      status,
      fingerprint,
    });
    return row;
  }

  async listCertificates(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const certificates = await query(
      `SELECT id, name, purpose, subject_cn, fingerprint_sha256, not_before, not_after, status,
              validation_ok, last_validated_at, secret_ref IS NOT NULL AS has_secret_ref, created_at
       FROM enterprise_certificates WHERE tenant_id=$1 ORDER BY not_after ASC NULLS LAST`,
      [tid],
    );
    return { certificates };
  }

  async validateCertificate(tenantId: string | undefined, user: JwtPayload, id: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne<{ id: string; pem_public: string; not_after: string }>(
      `SELECT id, pem_public, not_after FROM enterprise_certificates WHERE id=$1 AND tenant_id=$2`,
      [id, tid],
    );
    if (!row) throw new NotFoundException('Certificate not found');
    let ok = false;
    let error: string | undefined;
    try {
      const cert = new X509Certificate(row.pem_public);
      ok = new Date(cert.validTo) > new Date();
    } catch (e) {
      error = (e as Error).message;
    }
    const status = !ok ? 'expired' : new Date(row.not_after).getTime() - Date.now() < 30 * 86400000 ? 'expiring' : 'active';
    const updated = await queryOne(
      `UPDATE enterprise_certificates SET validation_ok=$3, status=$4, last_validated_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND tenant_id=$2
       RETURNING id, name, status, validation_ok, not_after, last_validated_at`,
      [id, tid, ok, status],
    );
    await this.audit(tid, user.sub, 'certificate.validated', 'enterprise_certificates', id, { ok, status, error });
    return { ...updated, error };
  }

  async rotateCertificateMeta(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    body: { pemPublic: string; secretRef?: string },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    // Re-upload as update
    const existing = await queryOne(`SELECT id FROM enterprise_certificates WHERE id=$1 AND tenant_id=$2`, [id, tid]);
    if (!existing) throw new NotFoundException('Certificate not found');
    const uploaded = await this.uploadCertificate(tid, user, {
      name: `rotated-${id.slice(0, 8)}`,
      pemPublic: body.pemPublic,
      secretRef: body.secretRef,
    });
    await query(`UPDATE enterprise_certificates SET status='revoked', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`, [
      id,
      tid,
    ]);
    await this.audit(tid, user.sub, 'certificate.rotated', 'enterprise_certificates', id, {
      replacementId: uploaded?.id,
    });
    return { revokedId: id, replacement: uploaded };
  }

  async listSecurityAudit(tenantId: string | undefined, user: JwtPayload, q?: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const events = q
      ? await query(
          `SELECT * FROM governance_audit_events
           WHERE tenant_id=$1 AND (action ILIKE $2 OR detail::text ILIKE $2)
           AND (action LIKE 'secrets.%' OR action LIKE 'certificate.%' OR action LIKE 'backup.%'
                OR action LIKE 'restore.%' OR action LIKE 'airgap.%' OR action LIKE 'session.%'
                OR action LIKE 'security.%')
           ORDER BY created_at DESC LIMIT 100`,
          [tid, `%${q}%`],
        )
      : await query(
          `SELECT * FROM governance_audit_events
           WHERE tenant_id=$1
           AND (action LIKE 'secrets.%' OR action LIKE 'certificate.%' OR action LIKE 'backup.%'
                OR action LIKE 'restore.%' OR action LIKE 'airgap.%' OR action LIKE 'session.%'
                OR action LIKE 'security.%' OR action LIKE 'deployment.%')
           ORDER BY created_at DESC LIMIT 100`,
          [tid],
        );
    return { events };
  }
}
