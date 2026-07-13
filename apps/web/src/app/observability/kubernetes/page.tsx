'use client';

import { Suspense } from 'react';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { ObserveEntityList } from '@/components/observe/ObserveEntityList';
import { LoadingSkeleton } from '@/components/UiStates';

export default function KubernetesPage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <ObserveEntityList
          domain="kubernetes"
          title="Kubernetes"
          purpose="Clusters, namespaces, nodes, pods, deployments, and workload health."
          apiPath="/observe/kubernetes"
        />
      </Suspense>
    </ObservePageFrame>
  );
}
