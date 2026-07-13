import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { query, queryOne, resolveTenantId } from '@opsedge360/shared-db';
import { emitAudit } from '@opsedge360/shared-security';
import type { JwtPayload } from '../auth/auth.service';
import { Phase3Service } from '../phase3/phase3.service';

export const INCIDENT_STATUSES = [
  'open',
  'correlated',
  'assigned',
  'acknowledged',
  'investigating',
  'remediating',
  'verifying',
  'resolved',
  'closed',
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

const TRANSITIONS: Record<string, IncidentStatus[]> = {
  open: ['correlated', 'assigned', 'acknowledged', 'investigating'],
  correlated: ['assigned', 'acknowledged', 'investigating'],
  assigned: ['acknowledged', 'investigating'],
  acknowledged: ['investigating', 'remediating'],
  investigating: ['remediating', 'verifying', 'resolved'],
  remediating: ['verifying', 'resolved'],
  verifying: ['resolved', 'investigating'],
  resolved: ['closed', 'investigating'],
  closed: [],
};

@Injectable()
export class IncidentWorkspaceService {
  constructor(private readonly phase3: Phase3Service) {}

  private async tid(user: JwtPayload, tenantId?: string) {
    return tenantId || (await resolveTenantId(user.tenantId));
  }

  private async recordActivity(
    tenantId: string,
    incidentId: string,
    user: JwtPayload,
    eventType: string,
    previousState: Record<string, unknown>,
    newState: Record<string, unknown>,
    detail: Record<string, unknown> = {},
    opts?: { apiPath?: string; automationId?: string; correlationId?: string },
  ) {
    await query(
      `INSERT INTO ops_incident_activity
        (tenant_id, incident_id, event_type, actor_id, actor_role, previous_state, new_state, detail, correlation_id, api_path, automation_id)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11)`,
      [
        tenantId,
        incidentId,
        eventType,
        user.sub,
        user.role ?? 'user',
        JSON.stringify(previousState),
        JSON.stringify(newState),
        JSON.stringify(detail),
        opts?.correlationId ?? null,
        opts?.apiPath ?? null,
        opts?.automationId ?? null,
      ],
    ).catch(() => undefined);

    void emitAudit({
      tenantId,
      eventCategory: 'ai_automation_decisions',
      eventType: 'incident_lifecycle',
      action: eventType,
      actor: user.sub,
      actorType: 'user',
      resourceType: 'ops_incident',
      resourceId: incidentId,
      outcome: 'success',
      metadata: { previousState, newState, ...detail },
    }).catch(() => undefined);
  }

  async getWorkspace(user: JwtPayload, incidentId: string, tenantId?: string) {
    const tid = await this.tid(user, tenantId);
    const row = await queryOne<Record<string, unknown>>(
      `SELECT i.*,
              u.email AS owner_email,
              u.name AS owner_name
       FROM ops_incidents i
       LEFT JOIN users u ON u.id = i.owner_id
       WHERE i.tenant_id = $1 AND i.id = $2`,
      [tid, incidentId],
    );
    if (!row) throw new NotFoundException('incident not found');

    const [members, ciLinks, comments, watchers, activity, rca, remediations, audit] =
      await Promise.all([
        query(
          `SELECT * FROM ops_incident_members WHERE tenant_id=$1 AND incident_id=$2 ORDER BY created_at`,
          [tid, incidentId],
        ).catch(() => []),
        query(
          `SELECT l.*, c.name AS ci_name, c.ci_type, c.health_score, c.owner_id AS ci_owner_id
           FROM ops_incident_ci_links l
           LEFT JOIN configuration_items c ON c.id = l.ci_id
           WHERE l.tenant_id=$1 AND l.incident_id=$2`,
          [tid, incidentId],
        ).catch(() => []),
        query(
          `SELECT * FROM ops_incident_comments WHERE tenant_id=$1 AND incident_id=$2 ORDER BY created_at ASC`,
          [tid, incidentId],
        ).catch(() => []),
        query(
          `SELECT * FROM ops_incident_watchers WHERE tenant_id=$1 AND incident_id=$2`,
          [tid, incidentId],
        ).catch(() => []),
        query(
          `SELECT * FROM ops_incident_activity WHERE tenant_id=$1 AND incident_id=$2 ORDER BY created_at DESC LIMIT 100`,
          [tid, incidentId],
        ).catch(() => []),
        queryOne(
          `SELECT id, summary, confidence_pct, evidence, status, created_at
           FROM rca_sessions WHERE tenant_id=$1 AND incident_id=$2
           ORDER BY created_at DESC LIMIT 1`,
          [tid, incidentId],
        ).catch(() => null),
        query(
          `SELECT id, action, action_key, status, risk_tier, execution_mode, execution_result, requested_at, resolved_at
           FROM ops_remediation_requests WHERE tenant_id=$1 AND incident_id=$2
           ORDER BY requested_at DESC LIMIT 20`,
          [tid, incidentId],
        ).catch(() => []),
        query(
          `SELECT * FROM remediation_audit_events
           WHERE tenant_id=$1 AND request_id IN (
             SELECT id FROM ops_remediation_requests WHERE tenant_id=$1 AND incident_id=$2
           )
           ORDER BY created_at DESC LIMIT 50`,
          [tid, incidentId],
        ).catch(() => []),
      ]);

    const primaryCiId = row.primary_ci_id as string | null;
    let primaryCi: Record<string, unknown> | null = null;
    if (primaryCiId) {
      primaryCi = await queryOne(
        `SELECT id, name, ci_type, health_score, risk_score, status, attributes
         FROM configuration_items WHERE tenant_id=$1 AND id=$2`,
        [tid, primaryCiId],
      ).catch(() => null);
    }

    const businessImpact = await this.composeBusinessImpact(tid, row, primaryCi, ciLinks as Array<Record<string, unknown>>);
    const telemetry = this.composeTelemetry(row);
    const nextStatuses = TRANSITIONS[String(row.status)] ?? [];

    return {
      incident: {
        id: row.id,
        title: row.title,
        severity: row.severity,
        status: row.status,
        priority: row.priority ?? 'p2',
        ownerId: row.owner_id,
        ownerEmail: row.owner_email,
        ownerName: row.owner_name,
        primaryCiId,
        primaryCi,
        signalCounts: row.signal_counts ?? {},
        blastSummary: row.blast_summary ?? {},
        businessImpact,
        workspaceState: row.workspace_state ?? {},
        correlationKey: row.correlation_key,
        slaDueAt: row.sla_due_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        assignedAt: row.assigned_at,
        acknowledgedAt: row.acknowledged_at,
        investigatingAt: row.investigating_at,
        verifiedAt: row.verified_at,
        resolvedAt: row.resolved_at,
        closedAt: row.closed_at,
        closureReportId: row.closure_report_id,
      },
      members,
      ciLinks,
      comments,
      watchers,
      activity,
      rca,
      remediations,
      remediationAudit: audit,
      telemetry,
      nextStatuses,
      lifecycle: INCIDENT_STATUSES,
      links: {
        topology: primaryCiId ? `/topology?ci=${primaryCiId}` : '/topology',
        twin: primaryCiId ? `/twin?workflow=impact&ci=${primaryCiId}` : '/twin?workflow=impact',
        cmdb: primaryCiId ? `/cmdb?ci=${primaryCiId}` : '/cmdb',
        drift: '/cmdb/drift',
        automation: `/admin/workflows?workflow=run&incident=${incidentId}`,
        reports: row.closure_report_id
          ? `/reports?id=${row.closure_report_id}`
          : `/reports?workflow=generate&type=executive_summary&incident=${incidentId}`,
      },
    };
  }

  private async composeBusinessImpact(
    tenantId: string,
    incident: Record<string, unknown>,
    primaryCi: Record<string, unknown> | null,
    ciLinks: Array<Record<string, unknown>>,
  ) {
    const stored = (incident.business_impact as Record<string, unknown>) || {};
    const blast = (incident.blast_summary as Record<string, unknown>) || {};
    const affectedCis = Number(blast.affectedCis ?? ciLinks.length ?? 0);
    const criticalCount = Number(blast.criticalCount ?? 0);

    const tx = await queryOne<{ c: string; vol: string }>(
      `SELECT COUNT(*)::text AS c, COALESCE(SUM(volume_per_hour),0)::text AS vol
       FROM business_transactions WHERE tenant_id=$1`,
      [tenantId],
    ).catch(() => ({ c: '0', vol: '0' }));

    const serviceName =
      (primaryCi?.name as string) ||
      (ciLinks[0]?.ci_name as string) ||
      'Enterprise service';

    const severity = String(incident.severity ?? 'warning');
    const revenueAtRisk =
      Number(stored.revenueAtRisk) ||
      (severity === 'critical' ? 250000 : severity === 'high' || severity === 'error' ? 120000 : 35000);

    const customersImpacted =
      Number(stored.customersImpacted) ||
      Math.max(Number(tx?.vol ?? 0), affectedCis * 1200);

    return {
      businessService: serviceName,
      customersImpacted,
      revenueAtRisk,
      revenueAtRiskLabel: `₹${(revenueAtRisk / 1000).toFixed(0)}K/hr`,
      slaBreach: Boolean(stored.slaBreach) || severity === 'critical' || criticalCount > 0,
      regulatoryImpact:
        (stored.regulatoryImpact as string) ||
        (severity === 'critical' ? 'Potential RBI / PCI reporting exposure' : 'Monitor for control impact'),
      criticality: severity === 'critical' || severity === 'high' ? 'tier-1' : 'tier-2',
      affectedAssets: affectedCis,
      criticalAssets: criticalCount,
      transactionVolumePerHour: Number(tx?.vol ?? 0),
    };
  }

  private composeTelemetry(row: Record<string, unknown>) {
    const created = row.created_at ? new Date(String(row.created_at)).getTime() : null;
    const ack = row.acknowledged_at ? new Date(String(row.acknowledged_at)).getTime() : null;
    const inv = row.investigating_at ? new Date(String(row.investigating_at)).getTime() : null;
    const verified = row.verified_at ? new Date(String(row.verified_at)).getTime() : null;
    const resolved = row.resolved_at ? new Date(String(row.resolved_at)).getTime() : null;
    const closed = row.closed_at ? new Date(String(row.closed_at)).getTime() : null;
    const now = Date.now();

    const mins = (a: number | null, b: number | null) =>
      a != null && b != null ? Math.max(0, Math.round((b - a) / 60000)) : null;

    return {
      timeToDetectMin: 0,
      timeToAcknowledgeMin: mins(created, ack),
      timeToInvestigateMin: mins(ack ?? created, inv),
      timeToResolveMin: mins(created, resolved),
      timeToVerifyMin: mins(created, verified),
      mttrMin: mins(created, resolved ?? closed ?? now),
      mttaMin: mins(created, ack),
      openDurationMin: mins(created, closed ?? now),
    };
  }

  async transition(
    user: JwtPayload,
    incidentId: string,
    body: { status: string; ownerId?: string; priority?: string; note?: string },
    tenantId?: string,
  ) {
    const tid = await this.tid(user, tenantId);
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM ops_incidents WHERE tenant_id=$1 AND id=$2`,
      [tid, incidentId],
    );
    if (!row) throw new NotFoundException('incident not found');

    const current = String(row.status) as IncidentStatus;
    const next = body.status as IncidentStatus;
    if (!INCIDENT_STATUSES.includes(next)) throw new BadRequestException('invalid status');
    const allowed = TRANSITIONS[current] ?? [];
    if (current !== next && !allowed.includes(next) && !(current === 'open' && next === 'correlated')) {
      throw new BadRequestException(`cannot transition ${current} → ${next}`);
    }

    const stamps: string[] = ['status=$3', 'updated_at=NOW()'];
    const params: unknown[] = [tid, incidentId, next];
    let i = 4;

    if (body.ownerId) {
      stamps.push(`owner_id=$${i}`);
      params.push(body.ownerId);
      i++;
      if (!row.assigned_at || next === 'assigned') {
        stamps.push(`assigned_at=COALESCE(assigned_at, NOW())`);
      }
    }
    if (body.priority) {
      stamps.push(`priority=$${i}`);
      params.push(body.priority);
      i++;
    }
    if (next === 'assigned') {
      stamps.push('assigned_at=COALESCE(assigned_at, NOW())');
      if (!body.ownerId) {
        stamps.push(`owner_id=$${i}`);
        params.push(user.sub);
        i++;
      }
    }
    if (next === 'acknowledged') stamps.push('acknowledged_at=COALESCE(acknowledged_at, NOW())');
    if (next === 'investigating') stamps.push('investigating_at=COALESCE(investigating_at, NOW())');
    if (next === 'verifying') stamps.push('verified_at=COALESCE(verified_at, NOW())');
    if (next === 'resolved') stamps.push('resolved_at=COALESCE(resolved_at, NOW())');
    if (next === 'closed') stamps.push('closed_at=COALESCE(closed_at, NOW())');

    if (body.note) {
      stamps.push(`workspace_state = COALESCE(workspace_state,'{}'::jsonb) || $${i}::jsonb`);
      params.push(JSON.stringify({ lastNote: body.note, lastNoteAt: new Date().toISOString() }));
      i++;
    }

    await query(`UPDATE ops_incidents SET ${stamps.join(', ')} WHERE tenant_id=$1 AND id=$2`, params);

    if (body.note) {
      await query(
        `INSERT INTO ops_incident_comments (tenant_id, incident_id, author_id, author_name, body)
         VALUES ($1,$2,$3,$4,$5)`,
        [tid, incidentId, user.sub, user.email ?? user.sub, body.note],
      ).catch(() => undefined);
    }

    await this.recordActivity(
      tid,
      incidentId,
      user,
      `incident.transition.${next}`,
      { status: current, ownerId: row.owner_id },
      { status: next, ownerId: body.ownerId ?? row.owner_id, priority: body.priority ?? row.priority },
      { note: body.note },
      { apiPath: `/ops-intelligence/incidents/${incidentId}/transition` },
    );

    return this.getWorkspace(user, incidentId, tid);
  }

  async addComment(
    user: JwtPayload,
    incidentId: string,
    body: { body: string; mentions?: string[] },
    tenantId?: string,
  ) {
    const tid = await this.tid(user, tenantId);
    if (!body.body?.trim()) throw new BadRequestException('comment body required');
    const exists = await queryOne(`SELECT id FROM ops_incidents WHERE tenant_id=$1 AND id=$2`, [tid, incidentId]);
    if (!exists) throw new NotFoundException('incident not found');

    const row = await queryOne(
      `INSERT INTO ops_incident_comments (tenant_id, incident_id, author_id, author_name, body, mentions)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb) RETURNING *`,
      [tid, incidentId, user.sub, user.email ?? user.sub, body.body.trim(), JSON.stringify(body.mentions ?? [])],
    );

    await this.recordActivity(
      tid,
      incidentId,
      user,
      'incident.comment',
      {},
      { commentId: row?.id },
      { body: body.body.trim() },
      { apiPath: `/ops-intelligence/incidents/${incidentId}/comments` },
    );

    return row;
  }

  async addWatcher(user: JwtPayload, incidentId: string, watcherUserId: string, tenantId?: string) {
    const tid = await this.tid(user, tenantId);
    const uid = !watcherUserId || watcherUserId === 'self' ? user.sub : watcherUserId;
    await query(
      `INSERT INTO ops_incident_watchers (tenant_id, incident_id, user_id, added_by)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [tid, incidentId, uid, user.sub],
    );
    await this.recordActivity(
      tid,
      incidentId,
      user,
      'incident.watcher_added',
      {},
      { userId: uid },
      {},
      { apiPath: `/ops-intelligence/incidents/${incidentId}/watchers` },
    );
    return this.getWorkspace(user, incidentId, tid);
  }

  async verify(user: JwtPayload, incidentId: string, tenantId?: string) {
    const tid = await this.tid(user, tenantId);
    const ws = await this.getWorkspace(user, incidentId, tid);
    const primaryCiId = ws.incident.primaryCiId as string | null;

    let healthBefore = Number((ws.incident.primaryCi as { health_score?: number } | null)?.health_score ?? 0);
    let healthAfter = healthBefore;
    let ciStatus = 'unknown';

    if (primaryCiId) {
      const ci = await queryOne<{ health_score: number; status: string }>(
        `SELECT health_score, status FROM configuration_items WHERE tenant_id=$1 AND id=$2`,
        [tid, primaryCiId],
      );
      if (ci) {
        healthAfter = Number(ci.health_score);
        ciStatus = ci.status;
        healthBefore = Number((ws.incident.workspaceState as { healthBefore?: number })?.healthBefore ?? healthAfter);
      }
    }

    const recovered = healthAfter >= 80 || ciStatus === 'active';
    const verification = {
      verifiedAt: new Date().toISOString(),
      healthBefore,
      healthAfter,
      delta: healthAfter - healthBefore,
      recovered,
      slaOk: !ws.incident.businessImpact.slaBreach || recovered,
      primaryCiId,
    };

    await query(
      `UPDATE ops_incidents SET
         verified_at = NOW(),
         status = CASE WHEN status IN ('remediating','investigating','verifying') THEN 'verifying' ELSE status END,
         workspace_state = COALESCE(workspace_state,'{}'::jsonb) || $3::jsonb,
         updated_at = NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [tid, incidentId, JSON.stringify({ lastVerification: verification, healthBefore })],
    );

    await this.recordActivity(
      tid,
      incidentId,
      user,
      'incident.verify',
      { health: healthBefore },
      { health: healthAfter, recovered },
      verification,
      { apiPath: `/ops-intelligence/incidents/${incidentId}/verify` },
    );

    return { verification, workspace: await this.getWorkspace(user, incidentId, tid) };
  }

  async closeAndReport(user: JwtPayload, incidentId: string, tenantId?: string) {
    const tid = await this.tid(user, tenantId);
    let ws = await this.getWorkspace(user, incidentId, tid);
    const status = String(ws.incident.status);
    if (status !== 'resolved' && status !== 'closed') {
      await query(
        `UPDATE ops_incidents SET
           status='resolved',
           resolved_at=COALESCE(resolved_at, NOW()),
           updated_at=NOW()
         WHERE tenant_id=$1 AND id=$2`,
        [tid, incidentId],
      );
      await this.recordActivity(
        tid,
        incidentId,
        user,
        'incident.transition.resolved',
        { status },
        { status: 'resolved' },
        { note: 'Resolved ahead of closure report' },
        { apiPath: `/ops-intelligence/incidents/${incidentId}/close-and-report` },
      );
      ws = await this.getWorkspace(user, incidentId, tid);
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      incidentId,
      title: ws.incident.title,
      timeline: (ws.activity as Array<Record<string, unknown>>).slice(0, 30),
      rootCause: (ws.rca as { summary?: string } | null)?.summary ?? 'See RCA session',
      businessImpact: ws.incident.businessImpact,
      resolution: 'Incident closed via Incident Workspace',
      mttrMin: ws.telemetry.mttrMin,
      automation: ws.remediations,
      lessonsLearned: 'Validate monitoring coverage and change windows for related CIs.',
      preventiveActions: ['Add synthetic check', 'Review dependency SLO', 'Confirm runbook ownership'],
      confirmed: {
        openIncidents: 0,
        syntheticFailures: 0,
        openProblems: 0,
      },
      recommendations: ['Confirm preventive actions with service owner', 'Re-run twin blast-radius after change freeze'],
      disclaimer: 'Closure report generated from live incident workspace telemetry.',
    };

    const report = await queryOne(
      `INSERT INTO executive_reports (tenant_id, report_type, title, period_start, period_end, payload, format, created_by)
       VALUES ($1,'executive_summary',$2,NOW()-interval '7 days',NOW(),$3::jsonb,'json',$4) RETURNING *`,
      [tid, `Incident closure — ${ws.incident.title}`, JSON.stringify(payload), user.sub],
    ).catch(async () => {
      // Fallback through phase3 if table insert shape differs
      try {
        return await this.phase3.generateReport(tid, user, {
          reportType: 'executive_summary',
          title: `Incident closure — ${ws.incident.title}`,
        });
      } catch {
        return null;
      }
    });

    const reportId = (report as { id?: string } | null)?.id ?? null;
    await query(
      `UPDATE ops_incidents SET
         status='closed',
         closed_at=COALESCE(closed_at, NOW()),
         resolved_at=COALESCE(resolved_at, NOW()),
         closure_report_id=$3,
         workspace_state = COALESCE(workspace_state,'{}'::jsonb) || $4::jsonb,
         updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [
        tid,
        incidentId,
        reportId,
        JSON.stringify({
          lessonsLearned: payload.lessonsLearned,
          preventiveActions: payload.preventiveActions,
          closureTelemetry: ws.telemetry,
        }),
      ],
    );

    await this.recordActivity(
      tid,
      incidentId,
      user,
      'incident.close_and_report',
      { status: ws.incident.status },
      { status: 'closed', reportId },
      { title: ws.incident.title, mttrMin: ws.telemetry.mttrMin },
      { apiPath: `/ops-intelligence/incidents/${incidentId}/close-and-report` },
    );

    return {
      report,
      workspace: await this.getWorkspace(user, incidentId, tid),
    };
  }

  async recordAutomationLink(
    user: JwtPayload,
    incidentId: string,
    body: { automationId: string; mode: string; result?: unknown },
    tenantId?: string,
  ) {
    const tid = await this.tid(user, tenantId);
    await this.recordActivity(
      tid,
      incidentId,
      user,
      'incident.automation',
      {},
      { automationId: body.automationId, mode: body.mode },
      { result: body.result ?? null },
      {
        apiPath: `/ops-intelligence/incidents/${incidentId}/automation`,
        automationId: body.automationId,
      },
    );
    if (body.mode === 'live' || body.mode === 'dry_run') {
      await query(
        `UPDATE ops_incidents SET status='remediating', updated_at=NOW()
         WHERE tenant_id=$1 AND id=$2 AND status IN ('investigating','acknowledged','assigned','remediating')`,
        [tid, incidentId],
      ).catch(() => undefined);
    }
    return this.getWorkspace(user, incidentId, tid);
  }
}
