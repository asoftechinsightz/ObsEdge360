import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/** MQTT IoT broker topic discovery — subscribe-only (Phase 3) */
export class MqttConnector implements DiscoveryConnector {
  name = 'mqtt';
  protocol = 'mqtt';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const broker = (config.broker as string) ?? 'mqtt://10.0.60.10:1883';
    const topics = (config.topics as Array<{ topic: string; name: string; deviceType?: string }>) ?? [
      { topic: 'factory/line3/temperature', name: 'iot-temp-line3', deviceType: 'sensor' },
      { topic: 'factory/line3/vibration', name: 'iot-vibration-line3', deviceType: 'sensor' },
      { topic: 'building/hvac/zone-a', name: 'smart-hvac-zone-a', deviceType: 'actuator' },
      { topic: 'energy/meter/main', name: 'energy-meter-main', deviceType: 'meter' },
    ];

    yield {
      externalId: `mqtt://${broker}`,
      name: 'mqtt-broker-industrial',
      ciType: 'ot_device',
      attributes: { protocol: 'mqtt', broker, role: 'broker' },
      aiConfidenceScore: 97,
      tags: ['iot', 'mqtt'],
    };

    for (const t of topics) {
      yield {
        externalId: `mqtt://${broker}/${t.topic}`,
        name: t.name,
        ciType: 'ot_device',
        attributes: {
          protocol: 'mqtt',
          topic: t.topic,
          broker,
          deviceType: t.deviceType,
          subscribeOnly: true,
        },
        aiConfidenceScore: 88,
        tags: ['iot', 'mqtt', t.deviceType ?? 'device'],
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
