import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  authorize,
  buildAuthContext,
  inferPermission,
  loadTenantPolicies,
  writeAuditLog,
  type AuthContext,
} from '@opsedge360/shared-security';
import { IS_PUBLIC_KEY } from './public.decorator';
import { REQUIRE_PERMISSION_KEY, SKIP_AUTHZ_KEY } from './require-permission.decorator';
import type { JwtPayload } from './auth.service';

function authzEnforceEnabled(): boolean {
  if (process.env.AUTHZ_ENFORCE === 'false') return false;
  if (process.env.AUTH_REQUIRED === 'false') return false;
  return true;
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
      throw new UnauthorizedException('Authentication required');
    }

    // Tenant binder: never trust client tenant without matching token
    const headerTenant = (request.headers['x-tenant-id'] as string | undefined)?.trim();
    if (headerTenant && headerTenant !== user.tenantId) {
      await this.safeAudit({
        tenantId: user.tenantId,
        actorId: user.sub,
        action: 'authz.deny',
        resourceType: 'tenant',
        ipAddress: request.ip,
        metadata: { reason: 'tenant_spoof', headerTenant },
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
      // Policies keyed by tenant UUID in DB — resolve via slug lookup is Wave 2;
      // for Wave 1 load by attempting slug-as-id only if UUID-shaped, else skip ABAC rows.
      if (/^[0-9a-f-]{36}$/i.test(user.tenantId)) {
        policies = await loadTenantPolicies(user.tenantId);
      }
    } catch {
      policies = [];
    }

    const decision = authorize(ctx, required, policies, {
      tenantId: user.tenantId,
      role: user.role,
      path: pathOnly,
    });

    if (!decision.allowed) {
      await this.safeAudit({
        tenantId: user.tenantId,
        actorId: user.sub,
        action: 'authz.deny',
        resourceType: required.split(':')[0],
        ipAddress: request.ip,
        metadata: { permission: required, reason: decision.reason },
      });
      throw new ForbiddenException({
        statusCode: 403,
        code: 'AUTHZ_DENIED',
        message: 'Insufficient permissions',
        permission: required,
      });
    }

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
