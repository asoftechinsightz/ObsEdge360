'use client';

import { Suspense } from 'react';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { ObserveEntityList } from '@/components/observe/ObserveEntityList';
import { LoadingSkeleton } from '@/components/UiStates';

export default function ApplicationsPage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <ObserveEntityList
          domain="applications"
          title="Applications"
          purpose="Application inventory, health, dependencies, and business impact — native to OpsEdge360."
          apiPath="/observe/applications"
        />
      </Suspense>
    </ObservePageFrame>
  );
}
