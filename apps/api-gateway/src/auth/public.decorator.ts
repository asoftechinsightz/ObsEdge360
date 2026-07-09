import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const TENANT_KEY = 'tenantId';
export const TenantId = () => SetMetadata(TENANT_KEY, true);
