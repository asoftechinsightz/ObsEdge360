import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

interface VCenterConfig {
  host: string;
  user: string;
  password: string;
  sessionPath?: string;
}

export class VmwareConnector implements DiscoveryConnector {
  name = 'vmware';
  protocol = 'vmware';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const vcenters = (config.vcenters as VCenterConfig[]) ?? [];
    for (const vc of vcenters) {
      const base = `https://${vc.host}`;
      const sessionUrl = `${base}${vc.sessionPath ?? '/rest/com/vmware/cis/session'}`;
      const auth = Buffer.from(`${vc.user}:${vc.password}`).toString('base64');

      const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}` },
        signal: AbortSignal.timeout(15_000),
      });
      if (!sessionRes.ok) continue;
      const session = (await sessionRes.json()) as { value?: string };
      if (!session.value) continue;

      const vmRes = await fetch(`${base}/rest/vcenter/vm`, {
        headers: { 'vmware-api-session-id': session.value },
        signal: AbortSignal.timeout(15_000),
      });
      if (!vmRes.ok) continue;
      const vms = (await vmRes.json()) as { value?: Array<{ vm: string; name: string; power_state?: string }> };

      for (const vm of vms.value ?? []) {
        yield {
          externalId: `vmware://${vm.vm}`,
          name: vm.name,
          ciType: 'vm',
          attributes: {
            vcenter: vc.host,
            powerState: vm.power_state,
            provider: 'vmware',
          },
          aiConfidenceScore: 96,
          tags: ['vmware', 'virtualization'],
        };
      }
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return Array.isArray(config.vcenters) && config.vcenters.length > 0;
  }
}
