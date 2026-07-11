import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequirePermission } from '../auth/require-permission.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { AutomationService } from './automation.service';

@ApiTags('automation')
@ApiBearerAuth()
@Controller('automation')
export class AutomationController {
  constructor(private readonly automation: AutomationService) {}

  @Get('dashboard')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Controlled automation dashboard' })
  dashboard(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.getDashboard(tenant?.id, user);
  }

  @Get('workflows')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listWorkflows(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.listWorkflows(tenant?.id, user);
  }

  @Post('workflows')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createWorkflow(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      definition?: { steps: unknown[] };
      runbookId?: string;
      policyId?: string;
      status?: string;
    },
  ) {
    return this.automation.createWorkflow(tenant?.id, user, body as never);
  }

  @Get('workflows/:id')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  getWorkflow(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.automation.getWorkflow(tenant?.id, user, id);
  }

  @Post('workflows/:id/start')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  startWorkflow(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { mode?: 'simulation' | 'dry_run' | 'live'; context?: Record<string, unknown> },
  ) {
    return this.automation.startExecution(tenant?.id, user, { workflowId: id, ...body });
  }

  @Get('runbooks')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listRunbooks(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.listRunbooks(tenant?.id, user);
  }

  @Post('runbooks')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createRunbook(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      description?: string;
      steps?: unknown[];
      linkedActionCode?: string;
      status?: string;
      version?: number;
    },
  ) {
    return this.automation.createRunbook(tenant?.id, user, body);
  }

  @Get('executions')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listExecutions(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.automation.listExecutions(tenant?.id, user, status);
  }

  @Get('executions/:id')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  getExecution(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.automation.getExecution(tenant?.id, user, id);
  }

  @Post('executions/:id/resume')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  resumeExecution(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.automation.resumeExecution(tenant?.id, user, id);
  }

  @Post('executions/:id/cancel')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  cancelExecution(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.automation.cancelExecution(tenant?.id, user, id);
  }

  @Get('simulations')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listSimulations(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.listSimulations(tenant?.id, user);
  }

  @Post('simulations')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createSimulation(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { workflowId: string; context?: Record<string, unknown> },
  ) {
    return this.automation.createSimulation(tenant?.id, user, body);
  }

  @Get('policies')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listPolicies(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.listPolicies(tenant?.id, user);
  }

  @Post('policies')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  createPolicy(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      name: string;
      policyType?: string;
      executionMode?: string;
      controlMode?: string;
      requireApproval?: boolean;
      emergencyStop?: boolean;
      safetyRules?: Record<string, unknown>;
      environmentScope?: string;
      maintenanceWindows?: unknown[];
      maxApprovalLevels?: number;
      approvalTtlMinutes?: number;
    },
  ) {
    return this.automation.createPolicy(tenant?.id, user, body);
  }

  @Get('approvals')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  listApprovals(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
  ) {
    return this.automation.listApprovals(tenant?.id, user, status ?? 'pending');
  }

  @Post('approvals/:id/decide')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  decideApproval(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { decision: 'approved' | 'rejected' | 'emergency_approved'; comment?: string },
  ) {
    return this.automation.decideApproval(tenant?.id, user, id, body);
  }

  @Get('emergency-stop')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  getEmergencyStop(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.getEmergencyStop(tenant?.id, user);
  }

  @Post('emergency-stop')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  setEmergencyStop(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { emergencyStop: boolean; reason?: string; pause?: boolean },
  ) {
    return this.automation.setEmergencyStop(tenant?.id, user, body);
  }

  @Post('emergency-stop/pause')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  pauseAll(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: { reason?: string },
  ) {
    return this.automation.pauseAll(tenant?.id, user, body?.reason);
  }

  @Post('emergency-stop/resume')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  resumeAll(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.resumeAll(tenant?.id, user);
  }

  @Post('emergency-stop/cancel-queued')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  cancelQueued(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.automation.cancelQueued(tenant?.id, user);
  }

  @Get('history')
  @RequirePermission(PermissionIds.AUDIT_READ)
  listHistory(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Query('eventType') eventType?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automation.listHistory(tenant?.id, user, {
      eventType,
      q,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch('policies/:id/emergency-stop')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Legacy per-policy e-stop (also updates control plane when stop=true)' })
  policyEmergencyStop(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') _id: string,
    @Body() body: { emergencyStop: boolean; reason?: string },
  ) {
    return this.automation.setEmergencyStop(tenant?.id, user, {
      emergencyStop: !!body.emergencyStop,
      reason: body.reason,
    });
  }
}
