import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/**
 * SNMP network device discovery — Phase 2.
 * Uses config inventory; real net-snmp integration in production deployments.
 */
export class SnmpConnector implements DiscoveryConnector {
  name = 'snmp';
  protocol = 'snmp';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const devices = (config.devices as Array<{
      ip: string; name: string; vendor?: string; model?: string; interfaces?: number;
    }>) ?? [
      { ip: '10.0.0.1', name: 'core-router-01', vendor: 'Cisco', model: 'ASR 9000', interfaces: 48 },
      { ip: '10.0.0.2', name: 'dist-switch-01', vendor: 'Juniper', model: 'EX4300', interfaces: 24 },
      { ip: '10.0.0.3', name: 'fw-perimeter-01', vendor: 'Palo Alto', model: 'PA-5220', interfaces: 12 },
    ];

    for (const dev of devices) {
      yield {
        externalId: `snmp://${dev.ip}`,
        name: dev.name,
        ciType: dev.name.includes('fw') ? 'firewall' : dev.name.includes('switch') ? 'network_device' : 'network_device',
        attributes: {
          ip: dev.ip,
          vendor: dev.vendor,
          model: dev.model,
          interfaces: dev.interfaces,
          protocol: 'snmp',
          snmpVersion: config.version ?? 'v2c',
        },
        aiConfidenceScore: 93,
        tags: ['network', 'snmp'],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return Array.isArray(config.devices) ? config.devices.length > 0 : true;
  }
}
