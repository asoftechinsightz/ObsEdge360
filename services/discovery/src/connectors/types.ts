import type { DiscoveredAsset, CiType } from '@opsedge360/shared-types';

export interface ConnectorConfig {
  [key: string]: unknown;
}

export interface DiscoveryConnector {
  name: string;
  protocol: string;
  discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset>;
  healthCheck(config: ConnectorConfig): Promise<boolean>;
}

export const SUPPORTED_PROTOCOLS = [
  'ssh', 'snmp', 'kubernetes', 'aws', 'azure', 'gcp', 'static',
  'opc-ua', 'modbus', 'mqtt', 'rest', 'winrm', 'wmi', 'vmware',
  'network', 'dependency', 'business-service',
  'docker', 'database', 'middleware',
] as const;

export type SupportedProtocol = (typeof SUPPORTED_PROTOCOLS)[number];
