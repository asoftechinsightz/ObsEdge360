import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.service';
import { Rc3Service } from './rc3.service';

@ApiTags('rc3-epp')
@ApiBearerAuth()
@Controller()
export class Rc3Controller {
  constructor(private readonly rc3: Rc3Service) {}

  @Get('rc3')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'RC3 Enterprise Pilot Program readiness overview' })
  overview(@CurrentUser() user: JwtPayload) {
    return this.rc3.overview(user);
  }

  @Put('rc3/approve')
  @RequirePermission(PermissionIds.WORKFLOW_EXECUTE)
  approve(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      productionSha?: string;
      validationToken?: string;
      security?: Record<string, unknown>;
      performance?: Record<string, unknown>;
      auditSummary?: Record<string, unknown>;
    },
  ) {
    return this.rc3.approve(user, body);
  }

  @Get('rc3/security')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  security(@CurrentUser() user: JwtPayload) {
    return this.rc3.securityPosture(user);
  }

  @Get('pilot/toolkit')
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  toolkit() {
    return this.rc3.pilotToolkit();
  }
}
