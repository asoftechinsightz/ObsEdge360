import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { CurrentTenant } from '../auth/current-tenant.decorator';
import type { JwtPayload } from '../auth/auth.service';
import type { TenantContext } from '../auth/authorization.guard';
import { query } from '@opsedge360/shared-db';
import { EDE_DEMO_EMAIL, EDE_ORG, EDE_SLUG, EdeSeedService } from './ede-seed.service';

class EdeLoadDto {
  @IsOptional()
  @IsBoolean()
  provisionDemoTenant?: boolean;

  @IsOptional()
  @IsString()
  organizationName?: string;
}

@ApiTags('demo-ede')
@ApiBearerAuth()
@Controller('demo/ede')
export class EdeController {
  constructor(private ede: EdeSeedService) {}

  @Get('status')
  @ApiOperation({ summary: 'Enterprise Demo Experience pack status for current tenant' })
  status(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    return this.ede.status(tenant?.id ?? user.tenantId);
  }

  @Get('guided')
  @ApiOperation({ summary: '15-minute guided evaluation steps' })
  async guided() {
    const steps = await query<{
      code: string;
      title: string;
      path: string;
      business_value: string;
      talk_track: string;
      sort_order: number;
    }>(
      `SELECT code, title, path, business_value, talk_track, sort_order
       FROM ede_guided_steps WHERE enabled=true ORDER BY sort_order ASC`,
    ).catch(() => []);
    return {
      durationMinutes: 15,
      title: 'Enterprise Demo Experience — Guided Evaluation',
      label: 'Illustrative Demo Data',
      organization: EDE_ORG,
      steps: steps.map((s) => ({
        code: s.code,
        title: s.title,
        path: s.path,
        businessValue: s.business_value,
        talkTrack: s.talk_track,
        order: s.sort_order,
      })),
      copilotPrompts: [
        "Summarize today's critical incidents.",
        'Why is UPI latency increasing?',
        'Show services at highest business risk.',
        "Explain yesterday's outage.",
        'Recommend actions for certificate expiry.',
        'Predict capacity risks.',
      ],
    };
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Demo data inventory for evaluators' })
  async inventory(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    const status = await this.ede.status(tenant?.id ?? user.tenantId);
    return {
      ...status,
      modules: [
        'Executive Home',
        'Discovery',
        'CMDB',
        'CMDB Drift',
        'Digital Twin',
        'Live Topology',
        'Banking360',
        'Security Center',
        'ITSM',
        'AI Copilot',
        'Executive Reports',
      ],
      demoLoginHint: {
        organization: EDE_ORG,
        slug: EDE_SLUG,
        email: EDE_DEMO_EMAIL,
        note: 'Password is set on pack provision/reset — see docs/ede/README.md',
      },
    };
  }

  @Post('load')
  @ApiOperation({ summary: 'Load Enterprise Demo pack into current tenant (or provision dedicated demo org)' })
  async load(
    @CurrentUser() user: JwtPayload,
    @CurrentTenant() tenant: TenantContext | undefined,
    @Body() body: EdeLoadDto,
  ) {
    if (user.role !== 'admin') {
      return { ok: false, error: 'Admin role required to load demo pack' };
    }
    let tenantId = tenant?.id ?? user.tenantId;
    let provisioned: { tenantId: string; email: string; created: boolean } | null = null;
    if (body?.provisionDemoTenant) {
      provisioned = await this.ede.ensureDemoTenant();
      tenantId = provisioned.tenantId;
    }
    const pack = await this.ede.loadPack(tenantId, { organizationName: body?.organizationName });
    return { ok: true, tenantId, provisioned, pack };
  }

  @Post('reset')
  @ApiOperation({ summary: 'One-click reset: clear tour progress and reload EDE pack' })
  async reset(@CurrentUser() user: JwtPayload, @CurrentTenant() tenant?: TenantContext) {
    if (user.role !== 'admin') {
      return { ok: false, error: 'Admin role required to reset demo pack' };
    }
    const tenantId = tenant?.id ?? user.tenantId;
    const result = await this.ede.resetAndLoad(tenantId);
    return { ok: true, label: 'Illustrative Demo Data', ...result };
  }

  @Post('provision')
  @ApiOperation({ summary: 'Provision Asoftech Global Bank demo tenant and load pack' })
  async provision(@CurrentUser() user: JwtPayload) {
    if (user.role !== 'admin') {
      return { ok: false, error: 'Admin role required' };
    }
    const provisioned = await this.ede.ensureDemoTenant();
    const pack = await this.ede.loadPack(provisioned.tenantId);
    return {
      ok: true,
      organization: EDE_ORG,
      slug: EDE_SLUG,
      email: provisioned.email,
      created: provisioned.created,
      pack,
    };
  }
}
