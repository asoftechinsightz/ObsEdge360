import type { DiscoveryConnector, ConnectorConfig } from './types';
import type { DiscoveredAsset } from '@opsedge360/shared-types';

/**
 * Kubernetes connector — discovers pods and services.
 * Phase 1: uses config-provided inventory or in-cluster mock when KUBERNETES_SERVICE_HOST is set.
 */
export class KubernetesConnector implements DiscoveryConnector {
  name = 'kubernetes';
  protocol = 'kubernetes';

  async *discover(config: ConnectorConfig): AsyncGenerator<DiscoveredAsset> {
    const namespace = (config.namespace as string) ?? 'default';
    const clusterName = (config.clusterName as string) ?? 'k8s-cluster';

    // Phase 1: structured mock based on namespace config
    const pods = (config.pods as Array<{ name: string; labels?: Record<string, string> }>) ?? [
      { name: 'payment-api-7d4f8b9c6-xk2lm', labels: { app: 'payment-api' } },
      { name: 'payment-api-7d4f8b9c6-mn8pq', labels: { app: 'payment-api' } },
      { name: 'auth-service-5c9d7f4b2-jk3rt', labels: { app: 'auth-service' } },
    ];

    yield {
      externalId: `k8s://${clusterName}`,
      name: clusterName,
      ciType: 'cloud_resource',
      attributes: { provider: 'kubernetes', namespace, inCluster: !!process.env.KUBERNETES_SERVICE_HOST },
      aiConfidenceScore: 99,
    };

    for (const pod of pods) {
      yield {
        externalId: `k8s://${clusterName}/${namespace}/${pod.name}`,
        name: pod.name,
        ciType: 'pod',
        attributes: { namespace, labels: pod.labels, cluster: clusterName },
        aiConfidenceScore: 95,
        relationships: [
          { targetExternalId: `k8s://${clusterName}`, type: 'runs_on' },
        ],
      };
    }
  }

  async healthCheck(config: ConnectorConfig): Promise<boolean> {
    return !!(config.clusterName || process.env.KUBERNETES_SERVICE_HOST);
  }
}
