export type AgentPlatform = 'windows' | 'linux' | 'mac' | 'docker' | 'kubernetes' | 'generic';

export type AgentStatus = 'online' | 'offline' | 'degraded' | 'updating';

export interface AgentCapabilities {
  metrics: boolean;
  logs: boolean;
  discovery: boolean;
  configPull: boolean;
  configPush: boolean;
  plugins: boolean;
  autoUpdate: boolean;
  mtls: boolean;
  compression: boolean;
  offlineQueue: boolean;
}

export interface AgentConfig {
  agentId: string;
  agentKey: string;
  apiUrl: string;
  platform: AgentPlatform;
  name: string;
  version: string;
  heartbeatIntervalMs: number;
  configPollIntervalMs: number;
  offlineQueueMaxItems: number;
  compressionEnabled: boolean;
  tlsVerify: boolean;
  mtlsCertPath?: string;
  mtlsKeyPath?: string;
  mtlsCaPath?: string;
  capabilities: string[];
  labels: Record<string, string>;
}

export interface AgentMetricsPayload {
  cpuPct?: number;
  memoryPct?: number;
  diskPct?: number;
  load1m?: number;
  networkInMbps?: number;
  networkOutMbps?: number;
  status?: AgentStatus;
  labels?: Record<string, unknown>;
}

export interface HeartbeatPayload {
  hostname?: string;
  version?: string;
  status?: AgentStatus;
  metadata?: Record<string, unknown>;
  metrics?: AgentMetricsPayload;
}

export interface QueuedMessage {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  body: unknown;
  createdAt: string;
  attempts: number;
  compressed: boolean;
}

export interface AgentConfigRevision {
  revision: number;
  config: Record<string, unknown>;
  checksum: string;
  appliedAt?: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  entrypoint: string;
  capabilities: string[];
  sandbox: 'process' | 'wasm' | 'none';
}

export interface UpdateManifest {
  version: string;
  downloadUrl: string;
  checksumSha256: string;
  signature?: string;
  releaseNotes?: string;
  mandatory: boolean;
}

export const DEFAULT_CAPABILITIES: AgentCapabilities = {
  metrics: true,
  logs: false,
  discovery: false,
  configPull: true,
  configPush: false,
  plugins: false,
  autoUpdate: true,
  mtls: false,
  compression: true,
  offlineQueue: true,
};
