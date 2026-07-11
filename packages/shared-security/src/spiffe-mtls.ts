import { createHash, X509Certificate } from 'crypto';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import path from 'path';
import forge from 'node-forge';
import { query, queryOne } from '@opsedge360/shared-db';
import { encryptSecret, decryptSecret } from './secrets-crypto';
import { ingestSecurityEvent } from './security-observability';
import { incSecurityMetric } from './metrics';
import { normalizeAuditEvent, toAuditLogRow, type AuditEvent } from './audit-event';

async function meshAudit(event: AuditEvent): Promise<void> {
  try {
    const normalized = normalizeAuditEvent(event);
    const row = toAuditLogRow(normalized);
    await query(
      `INSERT INTO audit_logs
        (tenant_id, actor_id, actor_type, action, resource_type, resource_id, correlation_id, ip_address, metadata, event_id, schema_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        row.tenantId,
        row.actorId ?? null,
        row.actorType ?? 'system',
        row.action,
        row.resourceType ?? null,
        row.resourceId ?? null,
        row.correlationId ?? null,
        row.ipAddress ?? null,
        JSON.stringify(row.metadata ?? {}),
        row.eventId ?? null,
        row.schemaVersion ?? '1.1',
      ],
    );
  } catch {
    /* fail-open for mesh control plane */
  }
}

function asTenantUuid(tenantId?: string | null): string | null {
  if (!tenantId || tenantId === 'platform') return null;
  if (/^[0-9a-f-]{36}$/i.test(tenantId)) return tenantId;
  return null;
}

export function spiffeTrustDomain(): string {
  return process.env.SPIFFE_TRUST_DOMAIN ?? 'opsedge360.local';
}

export function mtlsEnabled(): boolean {
  return process.env.MTLS_ENABLED === 'true';
}

export function mtlsRequired(): boolean {
  return process.env.MTLS_REQUIRED === 'true';
}

export function buildSpiffeId(identityName: string, tenantKey = 'platform'): string {
  const safeName = identityName.replace(/[^a-zA-Z0-9._-]/g, '-');
  const safeTenant = tenantKey.replace(/[^a-zA-Z0-9._-]/g, '-');
  return `spiffe://${spiffeTrustDomain()}/ns/${safeTenant}/sa/${safeName}`;
}

export function fingerprintPem(pem: string): string {
  const cert = new X509Certificate(pem);
  return createHash('sha256').update(cert.raw).digest('hex');
}

function extractSpiffeIdFromPem(pem: string): string | null {
  try {
    const cert = new X509Certificate(pem);
    const san = cert.subjectAltName ?? '';
    const match = san.match(/URI:(spiffe:\/\/[^\s,]+)/i) ?? san.match(/(spiffe:\/\/[^\s,]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function verifySpiffePeerPem(peerPem: string, trustBundlePem: string): {
  ok: boolean;
  spiffeId?: string;
  reason?: string;
} {
  try {
    const peer = new X509Certificate(peerPem);
    const now = new Date();
    if (now < new Date(peer.validFrom) || now > new Date(peer.validTo)) {
      return { ok: false, reason: 'expired_or_not_yet_valid' };
    }
    const spiffeId = extractSpiffeIdFromPem(peerPem);
    if (!spiffeId?.startsWith(`spiffe://${spiffeTrustDomain()}/`)) {
      return { ok: false, reason: 'spiffe_id_mismatch' };
    }
    // Split bundle into certs and check issuer fingerprint against CA
    const caPems = trustBundlePem
      .split(/-----END CERTIFICATE-----/)
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => `${c}\n-----END CERTIFICATE-----\n`);
    let trusted = false;
    for (const caPem of caPems) {
      try {
        const ca = new X509Certificate(caPem);
        if (peer.checkIssued(ca)) {
          trusted = true;
          break;
        }
      } catch {
        /* try next */
      }
    }
    if (!trusted) return { ok: false, reason: 'untrusted_issuer', spiffeId };
    return { ok: true, spiffeId };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

function generateKeyPair() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  return keys;
}

function certToPem(cert: forge.pki.Certificate): string {
  return forge.pki.certificateToPem(cert);
}

function privateKeyToPem(key: forge.pki.PrivateKey): string {
  return forge.pki.privateKeyToPem(key);
}

function createCaCert(keys: forge.pki.rsa.KeyPair, trustDomain: string): forge.pki.Certificate {
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = `01${Date.now().toString(16)}`;
  const attrs = [
    { name: 'commonName', value: `OpsEdge360 Trust CA (${trustDomain})` },
    { name: 'organizationName', value: 'OpsEdge360' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  const now = new Date();
  cert.validity.notBefore = now;
  cert.validity.notAfter = new Date(now.getTime() + 3650 * 24 * 60 * 60 * 1000);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return cert;
}

function createSvidCert(opts: {
  caCert: forge.pki.Certificate;
  caKey: forge.pki.PrivateKey;
  publicKey: forge.pki.PublicKey;
  spiffeId: string;
  ttlSeconds: number;
}): { cert: forge.pki.Certificate; serial: string } {
  const cert = forge.pki.createCertificate();
  cert.publicKey = opts.publicKey;
  const serial = `${Date.now().toString(16)}${Math.floor(Math.random() * 1e6).toString(16)}`;
  cert.serialNumber = serial;
  cert.setSubject([{ name: 'commonName', value: opts.spiffeId }]);
  cert.setIssuer(opts.caCert.subject.attributes);
  const now = new Date();
  cert.validity.notBefore = new Date(now.getTime() - 60_000);
  cert.validity.notAfter = new Date(now.getTime() + opts.ttlSeconds * 1000);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true, clientAuth: true },
    {
      name: 'subjectAltName',
      altNames: [{ type: 6, value: opts.spiffeId }],
    },
  ]);
  cert.sign(opts.caKey, forge.md.sha256.create());
  return { cert, serial };
}

async function loadActiveCa(): Promise<{
  id: string;
  trust_domain: string;
  pem_cert: string;
  enc_private_key: string;
  enc_nonce: string;
} | null> {
  return queryOne(
    `SELECT id, trust_domain, pem_cert, enc_private_key, enc_nonce
     FROM trust_ca WHERE status = 'active' ORDER BY created_at DESC LIMIT 1`,
  );
}

export async function bootstrapTrustCa(actorId?: string, tenantId = 'platform'): Promise<{
  caId: string;
  trustDomain: string;
  fingerprint: string;
  created: boolean;
}> {
  const existing = await loadActiveCa();
  if (existing) {
    return {
      caId: existing.id,
      trustDomain: existing.trust_domain,
      fingerprint: fingerprintPem(existing.pem_cert),
      created: false,
    };
  }
  const trustDomain = spiffeTrustDomain();
  const keys = generateKeyPair();
  const caCert = createCaCert(keys, trustDomain);
  const pemCert = certToPem(caCert);
  const pemKey = privateKeyToPem(keys.privateKey);
  const enc = encryptSecret(pemKey);
  const fp = fingerprintPem(pemCert);
  const row = await queryOne<{ id: string }>(
    `INSERT INTO trust_ca (trust_domain, subject_cn, fingerprint_sha256, pem_cert, enc_private_key, enc_nonce, status)
     VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING id`,
    [trustDomain, `OpsEdge360 Trust CA (${trustDomain})`, fp, pemCert, enc.ciphertext, enc.nonce],
  );
  const versionRow = await queryOne<{ v: string }>(`SELECT COALESCE(MAX(version),0)::text AS v FROM trust_bundles`);
  const nextVersion = Number(versionRow?.v ?? 0) + 1;
  await query(`INSERT INTO trust_bundles (version, pem_bundle) VALUES ($1,$2)`, [nextVersion, pemCert]);
  await meshAudit({
    tenantId,
    actor: actorId,
    actorType: 'system',
    action: 'trust.mesh.ca_bootstrap',
    resourceType: 'trust_ca',
    resourceId: row?.id,
    eventCategory: 'secrets_key_management',
    eventType: 'trust.ca_bootstrap',
    outcome: 'success',
  });
  await ingestSecurityEvent({
    tenantId,
    eventType: 'trust.ca_bootstrap',
    category: 'trust',
    severity: 'info',
    payload: { caId: row?.id, trustDomain, fingerprint: fp },
  }).catch(() => undefined);
  incSecurityMetric('security.mesh.ca_bootstrap');
  return { caId: row!.id, trustDomain, fingerprint: fp, created: true };
}

async function caMaterial(): Promise<{
  caCert: forge.pki.Certificate;
  caKey: forge.pki.PrivateKey;
  pemCert: string;
}> {
  const row = await loadActiveCa();
  if (!row?.enc_private_key || !row.enc_nonce) {
    throw new Error('Platform CA not bootstrapped');
  }
  const pemKey = decryptSecret(row.enc_private_key, row.enc_nonce);
  return {
    caCert: forge.pki.certificateFromPem(row.pem_cert),
    caKey: forge.pki.privateKeyFromPem(pemKey),
    pemCert: row.pem_cert,
  };
}

export async function getTrustBundle(): Promise<{ version: number; pemBundle: string } | null> {
  const row = await queryOne<{ version: number; pem_bundle: string }>(
    `SELECT version, pem_bundle FROM trust_bundles ORDER BY version DESC LIMIT 1`,
  );
  if (!row) return null;
  return { version: Number(row.version), pemBundle: row.pem_bundle };
}

export async function issueWorkloadSvid(opts: {
  identityId: string;
  spiffeId: string;
  tenantId?: string | null;
  ttlSeconds?: number;
  actorId?: string;
  rotateFromId?: string;
}): Promise<{
  svidId: string;
  spiffeId: string;
  fingerprint: string;
  notAfter: string;
  pemCert: string;
  pemKey: string;
}> {
  await bootstrapTrustCa(opts.actorId, opts.tenantId ?? 'platform');
  const { caCert, caKey } = await caMaterial();
  const keys = generateKeyPair();
  const ttl = opts.ttlSeconds ?? Number(process.env.SVID_TTL_SECONDS ?? 86400);
  const { cert, serial } = createSvidCert({
    caCert,
    caKey,
    publicKey: keys.publicKey,
    spiffeId: opts.spiffeId,
    ttlSeconds: ttl,
  });
  const pemCert = certToPem(cert);
  const pemKey = privateKeyToPem(keys.privateKey);
  const enc = encryptSecret(pemKey);
  const fp = fingerprintPem(pemCert);
  const notBefore = cert.validity.notBefore.toISOString();
  const notAfter = cert.validity.notAfter.toISOString();

  if (opts.rotateFromId) {
    await query(`UPDATE workload_svids SET status = 'rotated' WHERE id = $1 AND status = 'active'`, [
      opts.rotateFromId,
    ]);
  } else {
    await query(`UPDATE workload_svids SET status = 'rotated' WHERE identity_id = $1 AND status = 'active'`, [
      opts.identityId,
    ]);
  }

  const row = await queryOne<{ id: string }>(
    `INSERT INTO workload_svids
      (identity_id, spiffe_id, serial, fingerprint_sha256, pem_cert, enc_private_key, enc_nonce,
       not_before, not_after, status, rotated_from, tenant_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11)
     RETURNING id`,
    [
      opts.identityId,
      opts.spiffeId,
      serial,
      fp,
      pemCert,
      enc.ciphertext,
      enc.nonce,
      notBefore,
      notAfter,
      opts.rotateFromId ?? null,
      asTenantUuid(opts.tenantId),
    ],
  );

  await query(`UPDATE service_identities SET spiffe_id = $2, updated_at = NOW() WHERE id = $1`, [
    opts.identityId,
    opts.spiffeId,
  ]);

  const tenantUuid = asTenantUuid(opts.tenantId);
  // Also register public metadata in trust_certificates (Wave 5 registry)
  await query(
    `INSERT INTO trust_certificates
      (tenant_id, identity_id, subject_cn, fingerprint_sha256, not_before, not_after, status, pem_public, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8)
     ON CONFLICT (fingerprint_sha256) DO NOTHING`,
    [
      tenantUuid,
      opts.identityId,
      opts.spiffeId,
      fp,
      notBefore,
      notAfter,
      pemCert,
      JSON.stringify({ kind: 'svid', serial }),
    ],
  ).catch(() => undefined);

  const eventType = opts.rotateFromId ? 'trust.svid_rotate' : 'trust.svid_issue';
  const auditTenant = opts.tenantId ?? 'platform';
  await meshAudit({
    tenantId: auditTenant,
    actor: opts.actorId,
    actorType: 'user',
    action: eventType,
    resourceType: 'workload_svid',
    resourceId: row?.id,
    eventCategory: 'secrets_key_management',
    eventType,
    outcome: 'success',
    metadata: { spiffeId: opts.spiffeId, fingerprint: fp },
  });
  await ingestSecurityEvent({
    tenantId: auditTenant,
    eventType,
    category: 'trust',
    severity: 'info',
    payload: { svidId: row?.id, spiffeId: opts.spiffeId },
  }).catch(() => undefined);
  incSecurityMetric(opts.rotateFromId ? 'security.mesh.svid_rotate' : 'security.mesh.svid_issue');

  return {
    svidId: row!.id,
    spiffeId: opts.spiffeId,
    fingerprint: fp,
    notAfter,
    pemCert,
    pemKey,
  };
}

export async function rotateWorkloadSvid(
  svidId: string,
  actorId?: string,
  ttlSeconds?: number,
): Promise<ReturnType<typeof issueWorkloadSvid>> {
  const row = await queryOne<{
    id: string;
    identity_id: string;
    spiffe_id: string;
    tenant_id: string | null;
    status: string;
  }>(`SELECT id, identity_id, spiffe_id, tenant_id, status FROM workload_svids WHERE id = $1`, [svidId]);
  if (!row || row.status !== 'active') throw new Error('Active SVID not found');
  return issueWorkloadSvid({
    identityId: row.identity_id,
    spiffeId: row.spiffe_id,
    tenantId: row.tenant_id,
    actorId,
    ttlSeconds,
    rotateFromId: row.id,
  });
}

export async function revokeWorkloadSvid(svidId: string, actorId?: string, tenantId?: string): Promise<void> {
  const row = await queryOne<{ id: string; fingerprint_sha256: string; tenant_id: string | null }>(
    `UPDATE workload_svids SET status = 'revoked' WHERE id = $1 AND status IN ('active','rotated')
     RETURNING id, fingerprint_sha256, tenant_id`,
    [svidId],
  );
  if (!row) throw new Error('SVID not found');
  await query(
    `UPDATE trust_certificates SET status = 'revoked' WHERE fingerprint_sha256 = $1`,
    [row.fingerprint_sha256],
  ).catch(() => undefined);
  await meshAudit({
    tenantId: tenantId ?? row.tenant_id ?? 'platform',
    actor: actorId,
    actorType: 'user',
    action: 'trust.svid_revoke',
    resourceType: 'workload_svid',
    resourceId: svidId,
    eventCategory: 'secrets_key_management',
    eventType: 'trust.svid_revoke',
    outcome: 'success',
  });
  await ingestSecurityEvent({
    tenantId: tenantId ?? row.tenant_id ?? 'platform',
    eventType: 'trust.svid_revoke',
    category: 'trust',
    severity: 'warning',
    payload: { svidId },
  }).catch(() => undefined);
  incSecurityMetric('security.mesh.svid_revoke');
}

export async function decryptSvidPrivateKey(svidId: string): Promise<{ pemCert: string; pemKey: string; spiffeId: string }> {
  const row = await queryOne<{
    pem_cert: string;
    enc_private_key: string;
    enc_nonce: string;
    spiffe_id: string;
    status: string;
  }>(`SELECT pem_cert, enc_private_key, enc_nonce, spiffe_id, status FROM workload_svids WHERE id = $1`, [svidId]);
  if (!row || row.status === 'revoked') throw new Error('SVID unavailable');
  return {
    pemCert: row.pem_cert,
    pemKey: decryptSecret(row.enc_private_key, row.enc_nonce),
    spiffeId: row.spiffe_id,
  };
}

export function svidDir(): string {
  return process.env.SVID_DIR ?? '/var/lib/opsedge360/svids';
}

export async function materializeWorkloadFiles(
  entries: Array<{ name: string; svidId: string }>,
): Promise<{ dir: string; written: string[] }> {
  const dir = svidDir();
  mkdirSync(dir, { recursive: true });
  const bundle = await getTrustBundle();
  if (!bundle) throw new Error('Trust bundle missing');
  writeFileSync(path.join(dir, 'bundle.pem'), bundle.pemBundle, { mode: 0o600 });
  const written: string[] = ['bundle.pem'];
  for (const entry of entries) {
    const mat = await decryptSvidPrivateKey(entry.svidId);
    const sub = path.join(dir, entry.name);
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(sub, 'svid.pem'), mat.pemCert, { mode: 0o600 });
    writeFileSync(path.join(sub, 'svid.key'), mat.pemKey, { mode: 0o600 });
    writeFileSync(path.join(sub, 'spiffe_id'), mat.spiffeId, { mode: 0o600 });
    written.push(`${entry.name}/svid.pem`, `${entry.name}/svid.key`);
  }
  return { dir, written };
}

export function loadMtlsFiles(workloadName: string): {
  cert?: Buffer;
  key?: Buffer;
  ca?: Buffer;
  spiffeId?: string;
} {
  const dir = path.join(svidDir(), workloadName);
  const bundlePath = path.join(svidDir(), 'bundle.pem');
  const out: { cert?: Buffer; key?: Buffer; ca?: Buffer; spiffeId?: string } = {};
  const certPath = path.join(dir, 'svid.pem');
  const keyPath = path.join(dir, 'svid.key');
  const idPath = path.join(dir, 'spiffe_id');
  if (existsSync(certPath)) out.cert = readFileSync(certPath);
  if (existsSync(keyPath)) out.key = readFileSync(keyPath);
  if (existsSync(bundlePath)) out.ca = readFileSync(bundlePath);
  if (existsSync(idPath)) out.spiffeId = readFileSync(idPath, 'utf8').trim();
  return out;
}

export async function meshHealthSummary(): Promise<Record<string, unknown>> {
  const ca = await loadActiveCa();
  const bundle = await getTrustBundle();
  const counts = await queryOne<{ active: string; expiring: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active')::text AS active,
       COUNT(*) FILTER (WHERE status = 'active' AND not_after < NOW() + INTERVAL '7 days')::text AS expiring
     FROM workload_svids`,
  ).catch(() => ({ active: '0', expiring: '0' }));
  const withSpiffe = await queryOne<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM service_identities WHERE spiffe_id IS NOT NULL`,
  ).catch(() => ({ c: '0' }));
  return {
    ok: Boolean(ca),
    trustDomain: spiffeTrustDomain(),
    caFingerprint: ca ? fingerprintPem(ca.pem_cert) : null,
    bundleVersion: bundle?.version ?? null,
    activeSvids: Number(counts?.active ?? 0),
    expiringWithin7d: Number(counts?.expiring ?? 0),
    identitiesWithSpiffe: Number(withSpiffe?.c ?? 0),
    mtlsEnabled: mtlsEnabled(),
    mtlsRequired: mtlsRequired(),
    spireMode: 'platform-ca-spiffe-compatible',
  };
}

/** In-process mTLS handshake proof (client+server using same CA). */
export async function proveMtlsHandshake(): Promise<{ ok: boolean; clientSpiffeId?: string; reason?: string }> {
  const { createServer, request } = await import('https');
  await bootstrapTrustCa();
  const { caCert, caKey, pemCert: caPem } = await caMaterial();
  const serverKeys = generateKeyPair();
  const clientKeys = generateKeyPair();
  const serverSpiffe = buildSpiffeId('probe-server', 'platform');
  const clientSpiffe = buildSpiffeId('probe-client', 'platform');
  const serverCert = createSvidCert({
    caCert,
    caKey,
    publicKey: serverKeys.publicKey,
    spiffeId: serverSpiffe,
    ttlSeconds: 3600,
  }).cert;
  const clientCert = createSvidCert({
    caCert,
    caKey,
    publicKey: clientKeys.publicKey,
    spiffeId: clientSpiffe,
    ttlSeconds: 3600,
  }).cert;
  const serverPem = certToPem(serverCert);
  const clientPem = certToPem(clientCert);
  const serverKeyPem = privateKeyToPem(serverKeys.privateKey);
  const clientKeyPem = privateKeyToPem(clientKeys.privateKey);

  const checkServerIdentity = (_host: string, cert: import('tls').PeerCertificate): Error | undefined => {
    const san = (cert as { subjectaltname?: string }).subjectaltname ?? '';
    const match = san.match(/URI:(spiffe:\/\/[^,\s]+)/i) ?? san.match(/(spiffe:\/\/[^,\s]+)/i);
    if (!match?.[1]?.startsWith(`spiffe://${spiffeTrustDomain()}/`)) {
      return new Error(`spiffe_san_mismatch:${san || 'empty'}`);
    }
    return undefined;
  };

  return new Promise((resolve) => {
    const server = createServer(
      {
        key: serverKeyPem,
        cert: serverPem,
        ca: caPem,
        requestCert: true,
        rejectUnauthorized: true,
      },
      (req, res) => {
        const peer = (req.socket as import('tls').TLSSocket).getPeerCertificate(true);
        const peerPem = peer?.raw
          ? `-----BEGIN CERTIFICATE-----\n${Buffer.from(peer.raw).toString('base64').match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----\n`
          : clientPem;
        const verified = verifySpiffePeerPem(peerPem, caPem);
        res.writeHead(verified.ok ? 200 : 401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(verified));
      },
    );
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        resolve({ ok: false, reason: 'bind_failed' });
        return;
      }
      const req = request(
        {
          host: '127.0.0.1',
          port: addr.port,
          path: '/',
          method: 'GET',
          servername: 'localhost',
          key: clientKeyPem,
          cert: clientPem,
          ca: caPem,
          rejectUnauthorized: true,
          checkServerIdentity,
        },
        (res) => {
          let body = '';
          res.on('data', (d) => {
            body += d.toString();
          });
          res.on('end', () => {
            server.close();
            try {
              const parsed = JSON.parse(body) as { ok: boolean; spiffeId?: string; reason?: string };
              resolve({
                ok: Boolean(parsed.ok),
                clientSpiffeId: parsed.spiffeId ?? clientSpiffe,
                reason: parsed.reason,
              });
            } catch {
              resolve({ ok: false, reason: `parse_failed:${body.slice(0, 200)}` });
            }
          });
        },
      );
      req.on('error', (err) => {
        server.close();
        resolve({ ok: false, reason: err.message });
      });
      req.end();
    });
  });
}
