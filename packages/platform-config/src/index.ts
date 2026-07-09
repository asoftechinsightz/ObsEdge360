/**
 * Single source of truth for deployment topology and performance tuning.
 * Supports SaaS, Hybrid, and On-prem without code changes — env vars only.
 */

export type DeploymentMode = 'saas' | 'hybrid' | 'onprem';
export type PerformanceProfile = 'local' | 'standard' | 'high';

export interface PlatformConfig {
  deploymentMode: DeploymentMode;
  performanceProfile: PerformanceProfile;
  /** Multi-tenant isolation enforced (SaaS/Hybrid) */
  multiTenant: boolean;
  /** Data must stay in tenant region (SaaS/Hybrid regulated) */
  dataResidencyEnforced: boolean;
  /** Kafka required for event bus (optional on-prem with HTTP fallback) */
  kafkaRequired: boolean;
  /** Redis recommended for cache/sessions at scale */
  redisRecommended: boolean;
  /** Postgres pool max connections per service */
  dbPoolMax: number;
  /** Gateway/API response cache TTL (seconds) */
  cacheTtlSec: number;
  /** Enable response caching layer */
  cacheEnabled: boolean;
  /** Compliance scheduler interval */
  complianceIntervalMs: number;
  /** Max concurrent proxy requests per gateway instance */
  gatewayMaxConcurrent: number;
  /** Human-readable topology label */
  topologyLabel: string;
}

const PROFILE_SETTINGS: Record<PerformanceProfile, Pick<PlatformConfig, 'dbPoolMax' | 'cacheTtlSec' | 'complianceIntervalMs' | 'gatewayMaxConcurrent'>> = {
  local: { dbPoolMax: 8, cacheTtlSec: 30, complianceIntervalMs: 600_000, gatewayMaxConcurrent: 50 },
  standard: { dbPoolMax: 20, cacheTtlSec: 60, complianceIntervalMs: 300_000, gatewayMaxConcurrent: 200 },
  high: { dbPoolMax: 50, cacheTtlSec: 120, complianceIntervalMs: 180_000, gatewayMaxConcurrent: 1000 },
};

const MODE_SETTINGS: Record<DeploymentMode, Pick<PlatformConfig, 'multiTenant' | 'dataResidencyEnforced' | 'kafkaRequired' | 'redisRecommended' | 'topologyLabel'>> = {
  saas: {
    multiTenant: true,
    dataResidencyEnforced: true,
    kafkaRequired: true,
    redisRecommended: true,
    topologyLabel: 'Multi-tenant SaaS (cloud-hosted, shared infra)',
  },
  hybrid: {
    multiTenant: true,
    dataResidencyEnforced: true,
    kafkaRequired: true,
    redisRecommended: true,
    topologyLabel: 'Hybrid (control plane cloud + data plane on-prem/region)',
  },
  onprem: {
    multiTenant: false,
    dataResidencyEnforced: false,
    kafkaRequired: false,
    redisRecommended: true,
    topologyLabel: 'On-premise (single-tenant, customer data center)',
  },
};

let cached: PlatformConfig | null = null;

export function getPlatformConfig(): PlatformConfig {
  if (cached) return cached;

  const deploymentMode = (process.env.DEPLOYMENT_MODE ?? 'onprem') as DeploymentMode;
  const performanceProfile = (process.env.PERFORMANCE_PROFILE ?? 'local') as PerformanceProfile;
  const mode = MODE_SETTINGS[deploymentMode] ?? MODE_SETTINGS.onprem;
  const perf = PROFILE_SETTINGS[performanceProfile] ?? PROFILE_SETTINGS.local;

  cached = {
    deploymentMode,
    performanceProfile,
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    ...mode,
    ...perf,
  };
  return cached;
}

/** Reset cache (tests) */
export function resetPlatformConfig(): void {
  cached = null;
}
