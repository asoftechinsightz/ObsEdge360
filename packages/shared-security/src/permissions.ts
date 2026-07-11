/**
 * Central permission registry — do not invent ad-hoc permission strings in controllers.
 * Format remains resource:action for engine compatibility; registry ids are stable names.
 */
export const PermissionIds = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  DASHBOARD_VIEW: 'platform:read',
  ALERTS_MANAGE: 'observability:write',
  COMPLIANCE_VIEW: 'compliance:read',
  COMPLIANCE_MANAGE: 'compliance:write',
  AI_EXECUTE: 'agents:write',
  WORKFLOW_EXECUTE: 'platform:write',
  CMDB_READ: 'cmdb:read',
  CMDB_WRITE: 'cmdb:write',
  DISCOVERY_READ: 'discovery:read',
  DISCOVERY_WRITE: 'discovery:write',
  OBSERVABILITY_READ: 'observability:read',
  OBSERVABILITY_WRITE: 'observability:write',
  SECURITY_READ: 'security:read',
  SECURITY_WRITE: 'security:write',
  TRANSACTIONS_READ: 'transactions:read',
  TRANSACTIONS_WRITE: 'transactions:write',
} as const;

export type PermissionId = (typeof PermissionIds)[keyof typeof PermissionIds];

export const PERMISSION_REGISTRY: ReadonlyArray<{ id: PermissionId; description: string }> = [
  { id: PermissionIds.USERS_READ, description: 'Read users' },
  { id: PermissionIds.USERS_WRITE, description: 'Manage users' },
  { id: PermissionIds.DASHBOARD_VIEW, description: 'View dashboards' },
  { id: PermissionIds.ALERTS_MANAGE, description: 'Manage alerts' },
  { id: PermissionIds.COMPLIANCE_VIEW, description: 'View compliance' },
  { id: PermissionIds.COMPLIANCE_MANAGE, description: 'Manage compliance' },
  { id: PermissionIds.AI_EXECUTE, description: 'Execute AI/agent actions' },
  { id: PermissionIds.WORKFLOW_EXECUTE, description: 'Execute workflows' },
  { id: PermissionIds.CMDB_READ, description: 'Read CMDB' },
  { id: PermissionIds.CMDB_WRITE, description: 'Write CMDB' },
  { id: PermissionIds.DISCOVERY_READ, description: 'Read discovery' },
  { id: PermissionIds.DISCOVERY_WRITE, description: 'Write discovery' },
  { id: PermissionIds.OBSERVABILITY_READ, description: 'Read observability' },
  { id: PermissionIds.OBSERVABILITY_WRITE, description: 'Write observability' },
  { id: PermissionIds.SECURITY_READ, description: 'Read security' },
  { id: PermissionIds.SECURITY_WRITE, description: 'Write security' },
  { id: PermissionIds.TRANSACTIONS_READ, description: 'Read transactions' },
  { id: PermissionIds.TRANSACTIONS_WRITE, description: 'Write transactions' },
];

export function isRegisteredPermission(permission: string): boolean {
  return PERMISSION_REGISTRY.some((p) => p.id === permission) || permission.includes(':');
}
