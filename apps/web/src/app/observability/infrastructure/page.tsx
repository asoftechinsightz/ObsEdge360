'use client';

import { Suspense } from 'react';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { ObserveEntityList } from '@/components/observe/ObserveEntityList';
import { LoadingSkeleton } from '@/components/UiStates';

export default function InfrastructurePage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <ObserveEntityList
          domain="infrastructure"
          title="Infrastructure"
          purpose="Servers, virtual machines, cloud instances, storage, and OS health in one estate view."
          apiPath="/observe/infrastructure"
        />
      </Suspense>
    </ObservePageFrame>
  );
}
