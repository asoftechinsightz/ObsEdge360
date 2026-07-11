import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { resolveTenantStrict, type TenantRow } from '@opsedge360/shared-db';
import {
  authorize,
  buildAuthContext,
  inferPermission,
  loadTenantPolicies,
  writeAuditLog,
  incSecurityMetric,
  type AuthContext,
} from '@opsedge360/shared-security';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REQUIRE_PERMISSION_KEY, SKIP_AUTHZ_KEY } from './require-permission.decorator';
import type { JwtPayload } from './auth.service';

export interface TenantContext {
  id: string;
  slug: string;
  name: string;
}

function authzEnforceEnabled(): boolean {
  if (process.env.AUTHZ_ENFORCE === 'false') return false;
  if (process.env.AUTH_REQUIRED === 'false') return false;
  return true;
}

function tenantResolveLegacy(): boolean {
  return process.env.TENANT_RESOLVE === 'legacy';
}

function headerMatchesTenant(header: string, tenant: TenantRow, jwtTenant: string): boolean {
  return header === tenant.slug || header === tenant.id || header === jwtTenant;
}

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const skipAuthz = this.reflector.getAllAndOverride<boolean>(SKIP_AUTHZ_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipAuthz || !authzEnforceEnabled()) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user?.sub || !user.tenantId) {
      incSecurityMetric('security.auth.invalid_token');
      throw new UnauthorizedException('Authentication required');
    }

    let tenant: TenantRow | null = null;
    try {
      tenant = await resolveTenantStrict(user.tenantId);
    } catch (err) {
      if (tenantResolveLegacy()) {
        tenant = { id: user.tenantId, slug: user.tenantId, name: user.tenantId };
      } else if ((err as Error)?.message?.includes('Unknown tenant')) {
        incSecurityMetric('security.auth.denied');
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TENANT_UNKNOWN',
          message: 'Unknown tenant in authenticated identity',
        });
      } else {
        throw new ServiceUnavailableException('Tenant resolution unavailable');
      }
    }

    const tenantContext: TenantContext = {
      id: tenant!.id,
      slug: tenant!.slug,
      name: tenant!.name,
    };
    request.tenantContext = tenantContext;

    const headerTenant = (request.headers['x-tenant-id'] as string | undefined)?.trim();
    if (headerTenant && !headerMatchesTenant(headerTenant, tenant!, user.tenantId)) {
      incSecurityMetric('security.auth.cross_tenant_attempt');
      await this.safeAudit({
        tenantId: tenantContext.id,
        actorId: user.sub,
        action: 'authz.deny',
        resourceType: 'tenant',
        ipAddress: request.ip,
        metadata: {
          reason: 'tenant_spoof',
          headerTenant,
          decision: 'deny',
          policy: 'tenant-isolation-v1',
        },
      });
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TENANT_MISMATCH',
        message: 'Tenant context does not match authenticated identity',
      });
    }

    const ctx: AuthContext = await buildAuthContext({
      userId: user.sub,
      tenantSlug: user.tenantId,
      tenantId: tenantContext.id,
      legacyRole: user.role,
    });
    request.authContext = ctx;

    const requiredMeta = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const originalUrl = (request.originalUrl as string) || (request.url as string) || '';
    const pathOnly = originalUrl.split('?')[0] || '';
    const required = requiredMeta || inferPermission(request.method || 'GET', pathOnly);

    let policies: import('@opsedge360/shared-security').AbacPolicyRow[] = [];
    try {
      if (/^[0-9a-f-]{36}$/i.test(tenantContext.id)) {
        policies = await loadTenantPolicies(tenantContext.id);
      }
    } catch {
      policies = [];
    }

    const decision = authorize(ctx, required, policies, {
      tenantId: tenantContext.id,
      role: user.role,
      path: pathOnly,
    });

    if (!decision.allowed) {
      incSecurityMetric('security.auth.denied');
      await this.safeAudit({
        tenantId: tenantContext.id,
        actorId: user.sub,
        action: 'authz.deny',
        resourceType: required.split(':')[0],
        ipAddress: request.ip,
        metadata: {
          permission: required,
          reason: decision.reason,
          decision: 'deny',
          policy: 'rbac-abac-v1',
        },
      });
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AUTHZ_DENIED',
        message: 'Insufficient permissions',
        permission: required,
      });
    }

    incSecurityMetric('security.auth.success');
    return true;
  }

  private async safeAudit(entry: Parameters<typeof writeAuditLog>[0]): Promise<void> {
    try {
      await writeAuditLog(entry);
    } catch {
      // never fail closed on audit transport errors during deny path logging
    }
  }
}
