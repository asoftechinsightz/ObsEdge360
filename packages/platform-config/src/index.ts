/**
 * Single source of truth for deployment topology, app environment, and performance tuning.
 * Supports SaaS, Hybrid, and On-prem without code changes — env vars only.
 */

export type DeploymentMode = 'saas' | 'hybrid' | 'onprem';
export type PerformanceProfile = 'local' | 'standard' | 'high';
/** Runtime plane: separate from DEPLOYMENT_MODE (topology). */
export type AppEnvironment = 'production' | 'demo' | 'development' | 'local' | 'uat' | 'staging';

export interface PlatformConfig {
  deploymentMode: DeploymentMode;
  performanceProfile: PerformanceProfile;
  appEnv: AppEnvironment;
  /** Logical database name for this plane */
  databaseName: string;
  /** Demo / UAT must not send external notifications by default */
  outboundDisabled: boolean;
  isDemo: boolean;
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
  /** Human-readable environment label for UI banners */
  environmentLabel: string;
}

const PROFILE_SETTINGS: Record<
  PerformanceProfile,
  Pick<PlatformConfig, 'dbPoolMax' | 'cacheTtlSec' | 'complianceIntervalMs' | 'gatewayMaxConcurrent'>
> = {
  local: { dbPoolMax: 8, cacheTtlSec: 30, complianceIntervalMs: 600_000, gatewayMaxConcurrent: 50 },
  standard: { dbPoolMax: 20, cacheTtlSec: 60, complianceIntervalMs: 300_000, gatewayMaxConcurrent: 200 },
  high: { dbPoolMax: 50, cacheTtlSec: 120, complianceIntervalMs: 180_000, gatewayMaxConcurrent: 1000 },
};

const MODE_SETTINGS: Record<
  DeploymentMode,
  Pick<PlatformConfig, 'multiTenant' | 'dataResidencyEnforced' | 'kafkaRequired' | 'redisRecommended' | 'topologyLabel'>
> = {
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

const APP_ENV_SETTINGS: Record<
  AppEnvironment,
  Pick<PlatformConfig, 'databaseName' | 'outboundDisabled' | 'isDemo' | 'environmentLabel'>
> = {
  production: {
    databaseName: 'opsedge360_prod',
    outboundDisabled: false,
    isDemo: false,
    environmentLabel: 'Production',
  },
  demo: {
    databaseName: 'opsedge360_demo',
    outboundDisabled: true,
    isDemo: true,
    environmentLabel: 'Demo Environment',
  },
  development: {
    databaseName: 'opsedge360_dev',
    outboundDisabled: false,
    isDemo: false,
    environmentLabel: 'Development',
  },
  local: {
    databaseName: 'opsedge360_local',
    outboundDisabled: false,
    isDemo: false,
    environmentLabel: 'Local',
  },
  uat: {
    databaseName: 'opsedge360_uat',
    outboundDisabled: true,
    isDemo: false,
    environmentLabel: 'UAT',
  },
  staging: {
    databaseName: 'opsedge360_staging',
    outboundDisabled: false,
    isDemo: false,
    environmentLabel: 'Staging',
  },
};

const VALID_APP_ENVS = new Set<string>(Object.keys(APP_ENV_SETTINGS));

let cached: PlatformConfig | null = null;

function resolveAppEnv(): AppEnvironment {
  const raw = (process.env.APP_ENV || process.env.OPS_EDGE_ENV || '').toLowerCase().trim();
  if (VALID_APP_ENVS.has(raw)) return raw as AppEnvironment;
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'local';
}

export function getPlatformConfig(): PlatformConfig {
  if (cached) return cached;

  const deploymentMode = (process.env.DEPLOYMENT_MODE ?? 'onprem') as DeploymentMode;
  const performanceProfile = (process.env.PERFORMANCE_PROFILE ?? 'local') as PerformanceProfile;
  const appEnv = resolveAppEnv();
  const mode = MODE_SETTINGS[deploymentMode] ?? MODE_SETTINGS.onprem;
  const perf = PROFILE_SETTINGS[performanceProfile] ?? PROFILE_SETTINGS.local;
  const env = APP_ENV_SETTINGS[appEnv];

  const outboundOverride = process.env.OUTBOUND_DISABLED;
  const outboundDisabled =
    outboundOverride === 'true' ? true : outboundOverride === 'false' ? false : env.outboundDisabled;

  cached = {
    deploymentMode,
    performanceProfile,
    appEnv,
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    ...mode,
    ...perf,
    ...env,
    outboundDisabled,
    databaseName: process.env.POSTGRES_DB || env.databaseName,
  };
  return cached;
}

/** Reset cache (tests) */
export function resetPlatformConfig(): void {
  cached = null;
}

export function isOutboundDisabled(): boolean {
  return getPlatformConfig().outboundDisabled;
}
