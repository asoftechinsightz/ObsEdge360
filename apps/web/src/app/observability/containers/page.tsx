'use client';

import { Suspense } from 'react';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { ObserveEntityList } from '@/components/observe/ObserveEntityList';
import { LoadingSkeleton } from '@/components/UiStates';

export default function ContainersPage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <ObserveEntityList
          domain="containers"
          title="Containers"
          purpose="Container inventory, health, metrics context, and topology links."
          apiPath="/observe/containers"
        />
      </Suspense>
    </ObservePageFrame>
  );
}
