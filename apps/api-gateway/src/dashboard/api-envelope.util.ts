import { randomUUID } from 'crypto';
import type { ApiEnvelope, PaginationMeta, ResponseMetadata } from '@opsedge360/shared-types';

type EnvelopeInput<T> = {
  data: T;
  tenantId?: string;
  requestId?: string;
  metadata?: ResponseMetadata;
  pagination?: PaginationMeta | null;
  warnings?: ApiEnvelope<T>['warnings'];
};

export function buildApiEnvelope<T>(input: EnvelopeInput<T>): ApiEnvelope<T> {
  return {
    success: true,
    requestId: input.requestId ?? randomUUID(),
    timestamp: new Date().toISOString(),
    version: 'v1',
    tenantId: input.tenantId,
    data: input.data,
    metadata: input.metadata,
    pagination: input.pagination ?? null,
    errors: null,
    warnings: input.warnings ?? null,
  };
}

export function buildApiError<T = null>(
  errors: NonNullable<ApiEnvelope<T>['errors']>,
  requestId?: string,
  tenantId?: string,
): ApiEnvelope<T> {
  return {
    success: false,
    requestId: requestId ?? randomUUID(),
    timestamp: new Date().toISOString(),
    version: 'v1',
    tenantId,
    data: null as T,
    metadata: { generatedAt: new Date().toISOString() },
    pagination: null,
    errors,
    warnings: null,
  };
}
