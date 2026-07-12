import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { SyntheticsService } from './synthetics.service';

@ApiTags('synthetics')
@ApiBearerAuth()
@Controller('synthetics')
export class SyntheticsController {
  constructor(private readonly synthetics: SyntheticsService) {}

  @Get('monitors')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'List synthetic monitors (Phase A)' })
  list(@CurrentTenant() tenant: TenantContext | undefined, @CurrentUser() user: JwtPayload) {
    return this.synthetics.list(tenant?.id, user);
  }

  @Post('monitors')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  create(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    return this.synthetics.create(tenant?.id, user, body as never);
  }

  @Get('monitors/:id/results')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  results(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.synthetics.results(tenant?.id, user, id);
  }

  @Post('monitors/:id/run')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Execute synthetic check now' })
  run(
    @CurrentTenant() tenant: TenantContext | undefined,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.synthetics.runNow(tenant?.id, user, id);
  }
}
