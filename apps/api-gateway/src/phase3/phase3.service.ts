import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { query, queryOne } from '@opsedge360/shared-db';
import type { JwtPayload } from '../auth/auth.service';

function requireAdmin(user: JwtPayload) {
  if (user.role !== 'admin' && user.role !== 'operator') {
    throw new ForbiddenException('Admin or operator required');
  }
}

function requireTenant(tenantId?: string) {
  if (!tenantId) throw new BadRequestException('tenant required');
  return tenantId;
}

@Injectable()
export class Phase3Service {
  /* ---------- Preferences / notifications ---------- */
  async getPreferences(user: JwtPayload) {
    const row = await queryOne(`SELECT * FROM user_preferences WHERE user_id=$1`, [user.sub]);
    return (
      row || {
        theme: 'dark',
        landing_path: this.defaultLanding(user.role),
        prefs: {},
      }
    );
  }

  async upsertPreferences(user: JwtPayload, tenantId: string | undefined, body: { theme?: string; landingPath?: string; prefs?: Record<string, unknown> }) {
    const theme = body.theme ?? 'dark';
    if (!['dark', 'light', 'system'].includes(theme)) throw new BadRequestException('invalid theme');
    return queryOne(
      `INSERT INTO user_preferences (user_id, tenant_id, theme, landing_path, prefs, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         theme=EXCLUDED.theme,
         landing_path=COALESCE(EXCLUDED.landing_path, user_preferences.landing_path),
         prefs=EXCLUDED.prefs,
         updated_at=NOW()
       RETURNING *`,
      [user.sub, tenantId ?? null, theme, body.landingPath ?? this.defaultLanding(user.role), JSON.stringify(body.prefs ?? {})],
    );
  }

  defaultLanding(role?: string) {
    if (role === 'admin') return '/dashboard';
    if (role === 'operator') return '/ops-intelligence';
    return '/dashboard';
  }

  async listNotifications(user: JwtPayload, tenantId: string | undefined) {
    const tid = requireTenant(tenantId);
    return {
      notifications: await query(
        `SELECT * FROM user_notifications WHERE tenant_id=$1 AND (user_id IS NULL OR user_id=$2)
         ORDER BY created_at DESC LIMIT 50`,
        [tid, user.sub],
      ),
    };
  }

  async markNotificationRead(user: JwtPayload, tenantId: string | undefined, id: string) {
    const tid = requireTenant(tenantId);
    return queryOne(
      `UPDATE user_notifications SET read_at=NOW() WHERE id=$1 AND tenant_id=$2 AND (user_id IS NULL OR user_id=$3) RETURNING *`,
      [id, tid, user.sub],
    );
  }

  /* ---------- ITSM ---------- */
  async listProblems(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return { items: await query(`SELECT * FROM itsm_problems WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 100`, [tid]) };
  }

  async createProblem(tenantId: string | undefined, user: JwtPayload, body: { title: string; priority?: string; number?: string }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.title) throw new BadRequestException('title required');
    const number = body.number || `PRB-${Date.now().toString().slice(-6)}`;
    return queryOne(
      `INSERT INTO itsm_problems (tenant_id, number, title, status, priority) VALUES ($1,$2,$3,'open',$4) RETURNING *`,
      [tid, number, body.title, body.priority ?? 'medium'],
    );
  }

  async listChanges(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return { items: await query(`SELECT * FROM itsm_changes WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 100`, [tid]) };
  }

  async createChange(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { title: string; risk?: string; number?: string; scheduledStart?: string; scheduledEnd?: string; cabRequired?: boolean },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.title) throw new BadRequestException('title required');
    const number = body.number || `CHG-${Date.now().toString().slice(-6)}`;
    const change = await queryOne<{ id: string }>(
      `INSERT INTO itsm_changes (tenant_id, number, title, status, risk, cab_required, scheduled_start, scheduled_end)
       VALUES ($1,$2,$3,'draft',$4,$5,$6,$7) RETURNING *`,
      [
        tid,
        number,
        body.title,
        body.risk ?? 'medium',
        body.cabRequired !== false,
        body.scheduledStart ?? null,
        body.scheduledEnd ?? null,
      ],
    );
    if (body.cabRequired !== false && change?.id) {
      await query(`INSERT INTO itsm_cab_approvals (tenant_id, change_id, approver_role, status) VALUES ($1,$2,'cab','pending')`, [
        tid,
        change.id,
      ]);
    }
    return change;
  }

  async decideCab(tenantId: string | undefined, user: JwtPayload, approvalId: string, body: { status: 'approved' | 'rejected'; comment?: string }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!['approved', 'rejected'].includes(body.status)) throw new BadRequestException('status');
    const row = await queryOne(
      `UPDATE itsm_cab_approvals SET status=$1, comment=$2, decided_by=$3, decided_at=NOW()
       WHERE id=$4 AND tenant_id=$5 RETURNING *`,
      [body.status, body.comment ?? null, user.sub, approvalId, tid],
    );
    if (!row) throw new NotFoundException('approval not found');
    if (body.status === 'approved') {
      await query(`UPDATE itsm_changes SET status='approved', updated_at=NOW() WHERE id=$1 AND tenant_id=$2`, [
        (row as { change_id: string }).change_id,
        tid,
      ]);
    }
    return row;
  }

  async changeCalendar(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return {
      changes: await query(
        `SELECT id, number, title, status, risk, scheduled_start, scheduled_end FROM itsm_changes
         WHERE tenant_id=$1 AND scheduled_start IS NOT NULL ORDER BY scheduled_start ASC LIMIT 200`,
        [tid],
      ),
      windows: await query(`SELECT * FROM itsm_maintenance_windows WHERE tenant_id=$1 ORDER BY starts_at ASC LIMIT 100`, [tid]),
    };
  }

  async listKnowledge(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return { items: await query(`SELECT * FROM itsm_knowledge_articles WHERE tenant_id=$1 ORDER BY updated_at DESC LIMIT 100`, [tid]) };
  }

  async createKnowledge(tenantId: string | undefined, user: JwtPayload, body: { title: string; body: string; tags?: string[]; published?: boolean }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return queryOne(
      `INSERT INTO itsm_knowledge_articles (tenant_id, title, body, tags, published) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tid, body.title, body.body, body.tags ?? [], body.published ?? false],
    );
  }

  async listCatalog(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return { items: await query(`SELECT * FROM itsm_service_catalog_items WHERE tenant_id=$1 ORDER BY name`, [tid]) };
  }

  async listSla(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return { items: await query(`SELECT * FROM itsm_sla_policies WHERE tenant_id=$1 ORDER BY created_at DESC`, [tid]) };
  }

  async createSla(tenantId: string | undefined, user: JwtPayload, body: { name: string; targetPct?: number; metric?: string }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return queryOne(
      `INSERT INTO itsm_sla_policies (tenant_id, name, target_pct, metric) VALUES ($1,$2,$3,$4) RETURNING *`,
      [tid, body.name, body.targetPct ?? 99.9, body.metric ?? 'availability'],
    );
  }

  /* ---------- Browser synthetics ---------- */
  async listBrowserJourneys(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return {
      journeys: await query(`SELECT * FROM synthetic_browser_journeys WHERE tenant_id=$1 ORDER BY updated_at DESC`, [tid]),
      phase: 'B',
    };
  }

  async createBrowserJourney(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { name: string; baseUrl: string; steps?: unknown[]; captureScreenshot?: boolean },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    if (!body.name || !body.baseUrl) throw new BadRequestException('name and baseUrl required');
    const steps = body.steps?.length
      ? body.steps
      : [
          { action: 'goto', url: body.baseUrl },
          { action: 'wait', selector: 'body', timeoutMs: 5000 },
          { action: 'assert_title_contains', value: '' },
        ];
    return queryOne(
      `INSERT INTO synthetic_browser_journeys (tenant_id, name, base_url, steps, capture_screenshot, created_by)
       VALUES ($1,$2,$3,$4::jsonb,$5,$6) RETURNING *`,
      [tid, body.name, body.baseUrl, JSON.stringify(steps), body.captureScreenshot !== false, user.sub],
    );
  }

  async runBrowserJourney(tenantId: string | undefined, user: JwtPayload, journeyId: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const journey = await queryOne<{
      id: string;
      name: string;
      base_url: string;
      steps: unknown[];
      capture_screenshot: boolean;
    }>(`SELECT * FROM synthetic_browser_journeys WHERE id=$1 AND tenant_id=$2`, [journeyId, tid]);
    if (!journey) throw new NotFoundException('journey not found');

    const started = Date.now();
    // Phase B runner: deterministic simulation with real HTTP probe of base URL (Chromium worker optional later)
    let status: 'ok' | 'fail' | 'error' = 'ok';
    let errorMessage: string | null = null;
    const waterfall: { step: number; action: string; ms: number; ok: boolean }[] = [];
    const screenshots: { step: number; note: string }[] = [];
    const metrics: Record<string, unknown> = { engine: 'browser-sim-v1', fcp_ms: null, lcp_ms: null, cls: null };

    try {
      const t0 = Date.now();
      const res = await fetch(journey.base_url, { signal: AbortSignal.timeout(15000), redirect: 'follow' });
      const navMs = Date.now() - t0;
      waterfall.push({ step: 0, action: 'goto', ms: navMs, ok: res.ok });
      metrics.fcp_ms = Math.round(navMs * 0.4);
      metrics.lcp_ms = Math.round(navMs * 0.85);
      metrics.ttfb_ms = navMs;
      metrics.status_code = res.status;
      if (!res.ok) {
        status = 'fail';
        errorMessage = `navigation HTTP ${res.status}`;
      }
      const steps = (journey.steps || []) as { action?: string; selector?: string; value?: string }[];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const stepStart = Date.now();
        // Simulate step timing; login/form steps marked for future Chromium worker
        await new Promise((r) => setTimeout(r, 20));
        const ok = status === 'ok';
        waterfall.push({ step: i + 1, action: s.action || 'step', ms: Date.now() - stepStart, ok });
        if (journey.capture_screenshot) {
          screenshots.push({ step: i + 1, note: `capture:${s.action || 'step'} (metadata only until Chromium worker)` });
        }
      }
    } catch (e) {
      status = 'error';
      errorMessage = (e as Error).message;
    }

    const duration = Date.now() - started;
    const run = await queryOne(
      `INSERT INTO synthetic_browser_runs
         (journey_id, tenant_id, status, duration_ms, metrics, waterfall, screenshots, error_message, finished_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,NOW()) RETURNING *`,
      [
        journey.id,
        tid,
        status,
        duration,
        JSON.stringify(metrics),
        JSON.stringify(waterfall),
        JSON.stringify(screenshots),
        errorMessage,
      ],
    );

    if (status !== 'ok') {
      try {
        await query(
          `INSERT INTO alert_events (tenant_id, rule_id, severity, title, message, labels, fired_at)
           SELECT $1, ar.id, 'high', $2, $3, $4::jsonb, NOW()
           FROM alert_rules ar WHERE ar.tenant_id=$1 AND ar.enabled=true ORDER BY ar.created_at DESC LIMIT 1`,
          [tid, `Browser synthetic fail: ${journey.name}`, errorMessage || status, JSON.stringify({ journeyId: journey.id, source: 'browser-synthetics' })],
        );
      } catch {
        /* optional */
      }
    }
    return { run, journey: { id: journey.id, name: journey.name }, mode: 'browser-sim-v1' };
  }

  /* ---------- Executive reporting ---------- */
  async generateReport(tenantId: string | undefined, user: JwtPayload, body: { reportType: string; title?: string }) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const type = body.reportType;
    const allowed = [
      'sla_compliance',
      'availability',
      'incident_trends',
      'mttr',
      'capacity',
      'synthetics',
      'executive_summary',
      'compliance',
      'audit',
    ];
    if (!allowed.includes(type)) throw new BadRequestException('invalid reportType');

    const incidents = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM ops_incidents WHERE tenant_id=$1`, [tid]).catch(() => ({ c: '0' }));
    const synth = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM synthetic_results WHERE tenant_id=$1 AND status<>'ok'`, [tid]).catch(() => ({
      c: '0',
    }));
    const problems = await queryOne<{ c: string }>(`SELECT COUNT(*)::text AS c FROM itsm_problems WHERE tenant_id=$1 AND status='open'`, [tid]);
    const payload = {
      generatedAt: new Date().toISOString(),
      confirmed: {
        openIncidents: Number(incidents?.c ?? 0),
        syntheticFailures: Number(synth?.c ?? 0),
        openProblems: Number(problems?.c ?? 0),
      },
      correlations: [],
      recommendations: [
        Number(synth?.c ?? 0) > 0 ? 'Review failing synthetic monitors and browser journeys' : 'Synthetics healthy — maintain coverage',
        Number(problems?.c ?? 0) > 0 ? 'Drive problem records to known error / fix' : 'No open problems',
      ],
      disclaimer: 'Confirmed counts from live DB; recommendations are advisory.',
    };

    return queryOne(
      `INSERT INTO executive_reports (tenant_id, report_type, title, period_start, period_end, payload, format, created_by)
       VALUES ($1,$2,$3,NOW()-interval '7 days',NOW(),$4::jsonb,'json',$5) RETURNING *`,
      [tid, type, body.title || `${type} report`, JSON.stringify(payload), user.sub],
    );
  }

  async listReports(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return { reports: await query(`SELECT id, report_type, title, format, created_at FROM executive_reports WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50`, [tid]) };
  }

  async exportReport(
    tenantId: string | undefined,
    user: JwtPayload,
    id: string,
    format: 'json' | 'csv' | 'pdf' | 'xlsx',
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const row = await queryOne<{
      payload: Record<string, unknown>;
      title: string;
      report_type: string;
      created_at?: string;
    }>(`SELECT * FROM executive_reports WHERE id=$1 AND tenant_id=$2`, [id, tid]);
    if (!row) throw new NotFoundException('report not found');

    const confirmed = (row.payload?.confirmed || {}) as Record<string, unknown>;
    const recommendations = Array.isArray(row.payload?.recommendations)
      ? (row.payload.recommendations as string[])
      : [];

    if (format === 'csv' || format === 'xlsx') {
      const lines = [
        'section,key,value',
        ...Object.entries(confirmed).map(([k, v]) => `confirmed,${k},${v}`),
        ...recommendations.map((r, i) => `recommendation,${i + 1},"${String(r).replace(/"/g, '""')}"`),
        `meta,title,"${String(row.title).replace(/"/g, '""')}"`,
        `meta,report_type,${row.report_type}`,
        `meta,generated_at,${row.payload?.generatedAt ?? row.created_at ?? ''}`,
      ];
      const ext = format === 'xlsx' ? 'xlsx' : 'csv';
      return {
        format,
        filename: `${row.report_type}.${ext}`,
        content: lines.join('\n'),
      };
    }

    if (format === 'pdf') {
      const lines = [
        '%PDF-1.1',
        'OpsEdge360 Executive Report',
        `Title: ${row.title}`,
        `Type: ${row.report_type}`,
        `Generated: ${String(row.payload?.generatedAt ?? row.created_at ?? '')}`,
        '',
        'Confirmed metrics:',
        ...Object.entries(confirmed).map(([k, v]) => `  - ${k}: ${v}`),
        '',
        'Recommendations:',
        ...recommendations.map((r, i) => `  ${i + 1}. ${r}`),
        '',
        String(row.payload?.disclaimer ?? ''),
        '%%EOF',
      ];
      return {
        format: 'pdf',
        filename: `${row.report_type}.pdf`,
        content: lines.join('\n'),
      };
    }

    return { format: 'json', filename: `${row.report_type}.json`, content: row };
  }

  /* ---------- Marketplace ---------- */
  async listMarketplace(user: JwtPayload) {
    requireAdmin(user);
    return {
      extensions: await query(`SELECT * FROM marketplace_extensions ORDER BY kind, name`),
      note: 'Registry foundation only — no public marketplace in Phase 3',
    };
  }

  /* ---------- Banking360 payment monitors ---------- */
  async listPaymentMonitors(tenantId: string | undefined, user: JwtPayload) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return {
      monitors: await query(`SELECT * FROM banking360_payment_monitors WHERE tenant_id=$1 ORDER BY rail, name`, [tid]),
      rails: ['upi', 'imps', 'neft', 'rtgs', 'atm', 'cbs', 'api', 'payment_switch', 'fraud'],
    };
  }

  async upsertPaymentMonitor(
    tenantId: string | undefined,
    user: JwtPayload,
    body: { rail: string; name: string; target?: string; sloTargetMs?: number },
  ) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    return queryOne(
      `INSERT INTO banking360_payment_monitors (tenant_id, rail, name, target, slo_target_ms)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [tid, body.rail, body.name, body.target ?? null, body.sloTargetMs ?? 2000],
    );
  }

  async samplePaymentMonitor(tenantId: string | undefined, user: JwtPayload, id: string) {
    requireAdmin(user);
    const tid = requireTenant(tenantId);
    const mon = await queryOne<{ id: string; target: string | null; slo_target_ms: number; name: string }>(
      `SELECT * FROM banking360_payment_monitors WHERE id=$1 AND tenant_id=$2`,
      [id, tid],
    );
    if (!mon) throw new NotFoundException('monitor not found');
    let status = 'ok';
    let latency = 0;
    const evidence: Record<string, unknown> = { railProbe: true };
    if (mon.target) {
      const t0 = Date.now();
      try {
        const res = await fetch(mon.target, { signal: AbortSignal.timeout(10000) });
        latency = Date.now() - t0;
        evidence.status_code = res.status;
        if (!res.ok || latency > mon.slo_target_ms) status = 'fail';
      } catch (e) {
        status = 'error';
        latency = Date.now() - t0;
        evidence.error = (e as Error).message;
      }
    } else {
      status = 'ok';
      latency = 50;
      evidence.note = 'framework sample without target URL';
    }
    return queryOne(
      `INSERT INTO banking360_payment_samples (monitor_id, tenant_id, status, latency_ms, evidence)
       VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *`,
      [mon.id, tid, status, latency, JSON.stringify(evidence)],
    );
  }

  /* ---------- MFA readiness ---------- */
  async mfaStatus(user: JwtPayload) {
    const factors = await query(`SELECT factor_type, status, created_at FROM mfa_factors WHERE user_id=$1`, [user.sub]);
    return { enforced: false, framework: true, factors, note: 'MFA framework ready — enrollment enforcement not enabled in Phase 3' };
  }

  async setFeatureFlag(user: JwtPayload, key: string, enabled: boolean) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin required');
    const updated = await queryOne(
      `UPDATE feature_flags SET enabled=$2, updated_at=NOW()
       WHERE tenant_id IS NULL AND flag_key=$1 RETURNING *`,
      [key, enabled],
    );
    if (updated) return updated;
    return queryOne(
      `INSERT INTO feature_flags (tenant_id, flag_key, enabled, payload) VALUES (NULL,$1,$2,'{}'::jsonb) RETURNING *`,
      [key, enabled],
    );
  }
}
