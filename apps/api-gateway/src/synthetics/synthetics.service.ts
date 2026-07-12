import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as dns from 'dns/promises';
import * as net from 'net';
import * as tls from 'tls';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin' && user.role !== 'operator') {
    throw new ForbiddenException('Admin or operator role required');
  }
}

type MonitorType = 'http' | 'rest' | 'dns' | 'ssl' | 'tcp';

@Injectable()
export class SyntheticsService {
  async list(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = tenantId;
    if (!tid) throw new BadRequestException('tenant required');
    const monitors = await query(
      `SELECT * FROM synthetic_monitors WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 200`,
      [tid],
    );
    return { monitors, phase: 'A', types: ['http', 'rest', 'dns', 'ssl', 'tcp'] };
  }

  async create(
    tenantId: string | undefined,
    user: JwtPayload,
    body: {
      name: string;
      monitorType: MonitorType;
      target: string;
      intervalSeconds?: number;
      timeoutMs?: number;
      method?: string;
      headers?: Record<string, string>;
      assertions?: unknown[];
      tags?: string[];
    },
  ) {
    requireAdmin(user);
    const tid = tenantId;
    if (!tid) throw new BadRequestException('tenant required');
    if (!body?.name || !body?.monitorType || !body?.target) {
      throw new BadRequestException('name, monitorType, target required');
    }
    const allowed: MonitorType[] = ['http', 'rest', 'dns', 'ssl', 'tcp'];
    if (!allowed.includes(body.monitorType)) throw new BadRequestException('invalid monitorType');
    return queryOne(
      `INSERT INTO synthetic_monitors
         (tenant_id, name, monitor_type, target, interval_seconds, timeout_ms, method, headers, assertions, tags, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11) RETURNING *`,
      [
        tid,
        body.name,
        body.monitorType,
        body.target,
        body.intervalSeconds ?? 60,
        body.timeoutMs ?? 10000,
        body.method ?? 'GET',
        JSON.stringify(body.headers ?? {}),
        JSON.stringify(body.assertions ?? []),
        body.tags ?? ['synthetic'],
        user.sub,
      ],
    );
  }

  async results(tenantId: string | undefined, user: JwtPayload, monitorId: string) {
    requireAdmin(user);
    const tid = tenantId;
    if (!tid) throw new BadRequestException('tenant required');
    const rows = await query(
      `SELECT * FROM synthetic_results WHERE tenant_id=$1 AND monitor_id=$2 ORDER BY checked_at DESC LIMIT 50`,
      [tid, monitorId],
    );
    return { results: rows };
  }

  async runNow(tenantId: string | undefined, user: JwtPayload, monitorId: string) {
    requireAdmin(user);
    const tid = tenantId;
    if (!tid) throw new BadRequestException('tenant required');
    const mon = await queryOne<{
      id: string;
      monitor_type: MonitorType;
      target: string;
      timeout_ms: number;
      method: string;
      headers: Record<string, string>;
      assertions: unknown[];
      name: string;
    }>(`SELECT * FROM synthetic_monitors WHERE id=$1 AND tenant_id=$2`, [monitorId, tid]);
    if (!mon) throw new NotFoundException('monitor not found');

    const started = Date.now();
    let status: 'ok' | 'fail' | 'error' | 'timeout' = 'ok';
    let message = 'ok';
    let statusCode: number | null = null;
    let dnsMs: number | null = null;
    let tcpMs: number | null = null;
    let tlsDays: number | null = null;
    const evidence: Record<string, unknown> = { type: mon.monitor_type };

    try {
      if (mon.monitor_type === 'http' || mon.monitor_type === 'rest') {
        const ctrl = AbortSignal.timeout(mon.timeout_ms || 10000);
        const res = await fetch(mon.target, {
          method: mon.method || 'GET',
          headers: mon.headers || {},
          signal: ctrl,
          redirect: 'follow',
        });
        statusCode = res.status;
        evidence.contentType = res.headers.get('content-type');
        const expect = (mon.assertions || []) as { type?: string; equals?: number }[];
        const codeAssert = expect.find((a) => a.type === 'status_code');
        if (codeAssert?.equals != null && res.status !== codeAssert.equals) {
          status = 'fail';
          message = `status ${res.status} != ${codeAssert.equals}`;
        } else if (res.status >= 400) {
          status = 'fail';
          message = `HTTP ${res.status}`;
        }
      } else if (mon.monitor_type === 'dns') {
        const t0 = Date.now();
        const records = await dns.lookup(mon.target, { all: true });
        dnsMs = Date.now() - t0;
        evidence.records = records;
        if (!records.length) {
          status = 'fail';
          message = 'no DNS records';
        }
      } else if (mon.monitor_type === 'tcp') {
        const url = this.parseHostPort(mon.target, 443);
        const t0 = Date.now();
        await this.tcpConnect(url.host, url.port, mon.timeout_ms || 10000);
        tcpMs = Date.now() - t0;
      } else if (mon.monitor_type === 'ssl') {
        const url = this.parseHostPort(mon.target, 443);
        const cert = await this.tlsPeerCert(url.host, url.port, mon.timeout_ms || 10000);
        evidence.subject = cert.subject;
        evidence.valid_to = cert.valid_to;
        const days = Math.floor((Date.parse(cert.valid_to) - Date.now()) / 86400000);
        tlsDays = days;
        if (Number.isFinite(days) && days < 14) {
          status = 'fail';
          message = `certificate expires in ${days} days`;
        }
      }
    } catch (e) {
      const err = e as Error;
      status = err.name === 'TimeoutError' || /timeout/i.test(err.message) ? 'timeout' : 'error';
      message = err.message || 'check failed';
    }

    const latency = Date.now() - started;
    const row = await queryOne(
      `INSERT INTO synthetic_results
         (monitor_id, tenant_id, status, latency_ms, status_code, dns_ms, tcp_ms, tls_days_remaining, message, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) RETURNING *`,
      [
        mon.id,
        tid,
        status,
        latency,
        statusCode,
        dnsMs,
        tcpMs,
        tlsDays,
        message,
        JSON.stringify(evidence),
      ],
    );

    // Feed alert engine (best-effort) when failing
    if (status !== 'ok') {
      try {
        await query(
          `INSERT INTO alert_events (tenant_id, rule_id, severity, title, message, labels, fired_at)
           SELECT $1, ar.id, 'high', $2, $3, $4::jsonb, NOW()
           FROM alert_rules ar
           WHERE ar.tenant_id = $1 AND ar.enabled = true
           ORDER BY ar.created_at DESC LIMIT 1`,
          [
            tid,
            `Synthetic fail: ${mon.name}`,
            message,
            JSON.stringify({ monitorId: mon.id, type: mon.monitor_type, source: 'synthetics' }),
          ],
        );
      } catch {
        /* alert_rules may be empty — ignore */
      }
    }

    return { result: row, monitor: { id: mon.id, name: mon.name, type: mon.monitor_type } };
  }

  private parseHostPort(target: string, defaultPort: number) {
    try {
      if (target.includes('://')) {
        const u = new URL(target);
        return { host: u.hostname, port: Number(u.port || defaultPort) };
      }
    } catch {
      /* fall through */
    }
    const [host, p] = target.split(':');
    return { host, port: Number(p || defaultPort) };
  }

  private tcpConnect(host: string, port: number, timeoutMs: number) {
    return new Promise<void>((resolve, reject) => {
      const socket = net.connect({ host, port }, () => {
        socket.end();
        resolve();
      });
      socket.setTimeout(timeoutMs);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('tcp timeout'));
      });
      socket.on('error', reject);
    });
  }

  private tlsPeerCert(host: string, port: number, timeoutMs: number) {
    return new Promise<{ subject: unknown; valid_to: string }>((resolve, reject) => {
      const socket = tls.connect(
        { host, port, servername: host, rejectUnauthorized: false },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();
          if (!cert || !cert.valid_to) reject(new Error('no certificate'));
          else resolve({ subject: cert.subject, valid_to: cert.valid_to });
        },
      );
      socket.setTimeout(timeoutMs);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('tls timeout'));
      });
      socket.on('error', reject);
    });
  }
}
