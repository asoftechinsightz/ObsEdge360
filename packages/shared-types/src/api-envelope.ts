export const API_VERSION = 'v1';

export interface ApiError {
  code: string;
  message: string;
  field?: string | null;
  retryable?: boolean;
}

export interface ApiWarning {
  code: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ResponseMetadata {
  generatedAt: string;
  cacheHit?: boolean;
  cacheTtlSec?: number;
  dataMode?: 'live' | 'illustrative' | 'partial';
  label?: string;
  coverageLabel?: string;
  refreshIntervalSec?: number;
  role?: string;
  /** Widget registry version when dashboard payload */
  widgetRegistryVersion?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  requestId: string;
  timestamp: string;
  version: typeof API_VERSION | string;
  tenantId?: string;
  data: T;
  metadata?: ResponseMetadata;
  pagination?: PaginationMeta | null;
  errors?: ApiError[] | null;
  warnings?: ApiWarning[] | null;
}
