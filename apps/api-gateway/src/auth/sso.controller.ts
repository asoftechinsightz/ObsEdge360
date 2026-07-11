import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { Public } from './public.decorator';
import { CurrentUser } from './current-user.decorator';
import type { JwtPayload } from './auth.service';
import { SsoService } from './sso.service';

class UpsertSsoDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['oidc', 'saml'])
  protocol!: 'oidc' | 'saml';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  scopes?: string;

  @IsOptional()
  @IsString()
  entryPoint?: string;

  @IsOptional()
  @IsString()
  idpEntityId?: string;

  @IsOptional()
  @IsString()
  idpCert?: string;

  @IsOptional()
  @IsArray()
  allowedDomains?: string[];
}

@ApiTags('auth')
@Controller('auth/sso')
export class SsoController {
  constructor(private sso: SsoService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'SSO subsystem health' })
  ssoHealth() {
    return {
      ok: true,
      globalOidcConfigured: this.sso.globalOidcConfigured(),
      protocols: ['oidc', 'saml'],
    };
  }

  @Public()
  @Get('providers')
  @ApiOperation({ summary: 'List enabled SSO providers for an organization' })
  async publicProviders(@Query('tenant') tenant: string) {
    if (!tenant) return { providers: [], globalOidc: this.sso.globalOidcConfigured() };
    try {
      const providers = await this.sso.listPublicProviders(tenant);
      return { providers, globalOidc: this.sso.globalOidcConfigured() };
    } catch {
      return { providers: [], globalOidc: this.sso.globalOidcConfigured() };
    }
  }

  @Get('admin/providers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: list SSO providers for current tenant' })
  adminList(@CurrentUser() user: JwtPayload) {
    return this.sso.listProviders(user.tenantId);
  }

  @Post('admin/providers')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: create/update SSO provider' })
  adminUpsert(@CurrentUser() user: JwtPayload, @Body() body: UpsertSsoDto) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
    return this.sso.upsertProvider(user.tenantId, body);
  }

  @Delete('admin/providers/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: delete SSO provider' })
  async adminDelete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    if (user.role !== 'admin') throw new ForbiddenException('Admin role required');
    return { deleted: await this.sso.deleteProvider(user.tenantId, id) };
  }

  @Public()
  @Get('oidc/start')
  @ApiOperation({ summary: 'Start OIDC login (redirect)' })
  async oidcStart(
    @Query('tenant') tenant: string,
    @Query('providerId') providerId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    const result = providerId
      ? await this.sso.startOidc(tenant, providerId, redirect || '/dashboard')
      : await this.sso.startGlobalOidc(redirect || '/dashboard');
    return res.redirect(result.url);
  }

  @Public()
  @Get('oidc/callback')
  @ApiOperation({ summary: 'OIDC callback' })
  async oidcCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    if (error) {
      const web = process.env.OBS360_PUBLIC_URL || 'http://localhost:3000';
      return res.redirect(`${web}/login?error=${encodeURIComponent(errorDescription || error)}`);
    }
    const result = await this.sso.handleOidcCallback(code, state);
    return res.redirect(result.webRedirect);
  }

  @Public()
  @Get('saml/start')
  @ApiOperation({ summary: 'Start SAML login (redirect)' })
  async samlStart(
    @Query('tenant') tenant: string,
    @Query('providerId') providerId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    const result = await this.sso.startSaml(tenant, providerId, redirect || '/dashboard');
    return res.redirect(result.url);
  }

  @Public()
  @Post('saml/acs')
  @ApiOperation({ summary: 'SAML Assertion Consumer Service' })
  async samlAcs(@Req() req: Request, @Res() res: Response) {
    const body = req.body as { SAMLResponse?: string; RelayState?: string };
    const result = await this.sso.handleSamlAcs(body.SAMLResponse || '', body.RelayState || '');
    return res.redirect(result.webRedirect);
  }
}
