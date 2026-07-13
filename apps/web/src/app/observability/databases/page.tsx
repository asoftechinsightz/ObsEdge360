'use client';

import { Suspense } from 'react';
import { ObservePageFrame } from '@/components/observe/ObservePageFrame';
import { ObserveEntityList } from '@/components/observe/ObserveEntityList';
import { LoadingSkeleton } from '@/components/UiStates';

export default function DatabasesPage() {
  return (
    <ObservePageFrame>
      <Suspense fallback={<LoadingSkeleton rows={6} />}>
        <ObserveEntityList
          domain="databases"
          title="Databases"
          purpose="Database inventory, availability, performance, and dependency context."
          apiPath="/observe/databases"
        />
      </Suspense>
    </ObservePageFrame>
  );
}
