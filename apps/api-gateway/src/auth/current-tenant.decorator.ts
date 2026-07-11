import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext } from './authorization.guard';

/** Server-resolved tenant context (UUID + slug). Prefer over JWT slug for cache/audit. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantContext as TenantContext | undefined;
  },
);
