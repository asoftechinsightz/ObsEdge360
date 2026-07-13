import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PermissionIds } from '@opsedge360/shared-security';
import { resolveTenantId } from '@opsedge360/shared-db';
import { RequirePermission } from '../auth/require-permission.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { SearchService } from './search.service';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  @RequirePermission(PermissionIds.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Enterprise search across CMDB, incidents, services, users, reports, workspaces' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  async query(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    const tid = tenant?.id ?? (await resolveTenantId(user.tenantId));
    return this.search.search(tid, user, q ?? '', limit ? Number(limit) : 8);
  }
}
