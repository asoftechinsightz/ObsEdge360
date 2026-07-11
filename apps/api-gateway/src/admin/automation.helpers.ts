import { createHash } from 'crypto';

/** Pure helpers mirrored from AutomationService for unit coverage */
export function signWorkflowDefinition(definition: unknown): string {
  return createHash('sha256').update(JSON.stringify(definition ?? {})).digest('hex');
}

export function inMaintenanceWindow(
  windows: Array<{ days?: number[]; startMinute?: number; endMinute?: number }>,
  now = new Date(),
): boolean {
  if (!Array.isArray(windows) || windows.length === 0) return true;
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return windows.some((win) => {
    const days = win.days ?? [0, 1, 2, 3, 4, 5, 6];
    if (!days.includes(day)) return false;
    const start = win.startMinute ?? 0;
    const end = win.endMinute ?? 24 * 60;
    return minutes >= start && minutes <= end;
  });
}

export function assertAutoExecuteNotProduction(controlMode: string, executionMode: string): string | null {
  if (controlMode === 'auto_execute' && executionMode === 'production') {
    return 'auto_execute is not permitted for production mode (no autonomous production)';
  }
  return null;
}
