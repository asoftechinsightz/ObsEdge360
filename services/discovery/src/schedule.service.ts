import { query, queryOne } from '@opsedge360/shared-db';
import * as discovery from './discovery.service';

export interface ScheduleRow {
  id: string;
  tenant_id: string;
  connector_id: string;
  interval_minutes: number;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  notify_on_complete: boolean;
  created_at: string;
  connector_name?: string;
}

export interface NotificationRow {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  message: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export async function listSchedules(tenantId: string): Promise<ScheduleRow[]> {
  return query<ScheduleRow>(
    `SELECT s.*, c.name AS connector_name
     FROM discovery_scan_schedules s
     JOIN discovery_connectors c ON c.id = s.connector_id
     WHERE s.tenant_id = $1
     ORDER BY s.created_at DESC`,
    [tenantId],
  );
}

export async function createSchedule(
  tenantId: string,
  data: { connectorId: string; intervalMinutes?: number; notifyOnComplete?: boolean },
): Promise<ScheduleRow> {
  const connector = await queryOne(
    'SELECT id FROM discovery_connectors WHERE tenant_id = $1 AND id = $2',
    [tenantId, data.connectorId],
  );
  if (!connector) throw new Error('Connector not found');

  const interval = data.intervalMinutes ?? 60;
  const row = await queryOne<ScheduleRow>(
    `INSERT INTO discovery_scan_schedules (tenant_id, connector_id, interval_minutes, notify_on_complete, next_run_at)
     VALUES ($1, $2, $3, $4, NOW() + ($3 * INTERVAL '1 minute'))
     RETURNING *`,
    [tenantId, data.connectorId, interval, data.notifyOnComplete ?? true],
  );
  if (!row) throw new Error('Failed to create schedule');
  return row;
}

export async function deleteSchedule(tenantId: string, scheduleId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM discovery_scan_schedules WHERE tenant_id = $1 AND id = $2 RETURNING id',
    [tenantId, scheduleId],
  );
  return result.length > 0;
}

export async function createNotification(
  tenantId: string,
  data: { type: string; title: string; message?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  await query(
    `INSERT INTO discovery_notifications (tenant_id, type, title, message, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [tenantId, data.type, data.title, data.message ?? null, JSON.stringify(data.metadata ?? {})],
  );
}

export async function listNotifications(tenantId: string, limit = 50): Promise<NotificationRow[]> {
  return query<NotificationRow>(
    `SELECT * FROM discovery_notifications
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [tenantId, limit],
  );
}

export async function markNotificationRead(tenantId: string, id: string): Promise<void> {
  await query(
    'UPDATE discovery_notifications SET read = true WHERE tenant_id = $1 AND id = $2',
    [tenantId, id],
  );
}

export async function runDueSchedules(): Promise<void> {
  const due = await query<ScheduleRow>(
    `SELECT * FROM discovery_scan_schedules
     WHERE enabled = true AND (next_run_at IS NULL OR next_run_at <= NOW())`,
  );

  for (const schedule of due) {
    try {
      const result = await discovery.runScan(schedule.tenant_id, schedule.connector_id);
      await query(
        `UPDATE discovery_scan_schedules
         SET last_run_at = NOW(),
             next_run_at = NOW() + (interval_minutes * INTERVAL '1 minute')
         WHERE id = $1`,
        [schedule.id],
      );
      if (schedule.notify_on_complete) {
        await createNotification(schedule.tenant_id, {
          type: 'scan_complete',
          title: 'Scheduled discovery scan completed',
          message: `Discovered ${result.assetsDiscovered} assets`,
          metadata: { scheduleId: schedule.id, connectorId: schedule.connector_id, scanId: result.scanId },
        });
      }
    } catch (err) {
      await createNotification(schedule.tenant_id, {
        type: 'scan_failed',
        title: 'Scheduled discovery scan failed',
        message: (err as Error).message,
        metadata: { scheduleId: schedule.id, connectorId: schedule.connector_id },
      });
      await query(
        `UPDATE discovery_scan_schedules
         SET next_run_at = NOW() + (interval_minutes * INTERVAL '1 minute')
         WHERE id = $1`,
        [schedule.id],
      );
    }
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startScheduleRunner(): void {
  if (schedulerTimer) return;
  const intervalMs = Number(process.env.DISCOVERY_SCHEDULER_MS ?? 60_000);
  schedulerTimer = setInterval(() => {
    runDueSchedules().catch((err) => console.warn('[discovery] scheduler:', err.message));
  }, intervalMs);
  console.log(`[discovery] schedule runner every ${intervalMs}ms`);
}

export function stopScheduleRunner(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
