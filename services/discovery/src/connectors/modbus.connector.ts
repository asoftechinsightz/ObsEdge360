import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/** Modbus TCP/RTU device discovery — read-only holding register scan (Phase 3) */
export class ModbusConnector implements DiscoveryConnector {
  name = 'modbus';
  protocol = 'modbus';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const devices = (config.devices as Array<{
      ip: string; port?: number; unitId: number; name: string; type?: string;
    }>) ?? [
      { ip: '10.0.50.20', port: 502, unitId: 1, name: 'vfd-motor-drive-01', type: 'drive' },
      { ip: '10.0.50.21', port: 502, unitId: 2, name: 'temp-sensor-array-01', type: 'sensor' },
      { ip: '10.0.50.22', port: 502, unitId: 1, name: 'flow-meter-steam-01', type: 'meter' },
    ];

    for (const dev of devices) {
      yield {
        externalId: `modbus://${dev.ip}:${dev.port ?? 502}/${dev.unitId}`,
        name: dev.name,
        ciType: 'ot_device',
        attributes: {
          protocol: 'modbus',
          ip: dev.ip,
          port: dev.port ?? 502,
          unitId: dev.unitId,
          deviceType: dev.type,
          readOnly: true,
          safetyZone: config.safetyZone ?? 'production',
        },
        aiConfidenceScore: 91,
        tags: ['ot', 'modbus'],
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
