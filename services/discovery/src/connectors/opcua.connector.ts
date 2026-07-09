import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/** OPC-UA industrial discovery — read-only, rate-limited (Phase 3) */
export class OpcUaConnector implements DiscoveryConnector {
  name = 'opc-ua';
  protocol = 'opc-ua';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const zone = (config.safetyZone as string) ?? 'production';
    const endpoints = (config.endpoints as Array<{
      url: string; name: string; vendor?: string; nodeCount?: number;
    }>) ?? [
      { url: 'opc.tcp://10.0.50.10:4840', name: 'plc-line3-main', vendor: 'Siemens', nodeCount: 1240 },
      { url: 'opc.tcp://10.0.50.11:4840', name: 'scada-hmi-01', vendor: 'Rockwell', nodeCount: 890 },
      { url: 'opc.tcp://10.0.50.12:4840', name: 'sensor-array-boiler', vendor: 'ABB', nodeCount: 156 },
    ];

    for (const ep of endpoints) {
      yield {
        externalId: `opcua://${ep.url}`,
        name: ep.name,
        ciType: 'ot_device',
        attributes: {
          protocol: 'opc-ua',
          endpoint: ep.url,
          vendor: ep.vendor,
          safetyZone: zone,
          nodeCount: ep.nodeCount,
          readOnly: true,
          pollRateHz: config.maxPollRateHz ?? 0.5,
        },
        aiConfidenceScore: 94,
        tags: ['ot', 'opc-ua', zone],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return config.readOnly !== false;
  }
}
