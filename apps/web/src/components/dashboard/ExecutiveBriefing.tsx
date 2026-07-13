'use client';

import type { ExecutiveDashboardPayload, ResponseMetadata } from '@opsedge360/shared-types';
import { ExecutiveNarrative } from '@/components/apex/ExecutiveNarrative';
import { TrustBar } from '@/components/apex/TrustBar';
import { InlineAiAssist } from '@/components/apex/InlineAiAssist';

type Props = {
  payload: ExecutiveDashboardPayload;
  metadata: ResponseMetadata;
};

/** Executive briefing — props only, no API calls (Wave 2). */
export function ExecutiveBriefing({ payload, metadata }: Props) {
  const { narrative, kpis } = payload;
  const freshness =
    metadata.dataMode === 'live' ? 'live' : metadata.dataMode === 'illustrative' ? 'recent' : 'unknown';

  return (
    <>
      <TrustBar
        lastUpdated={metadata.generatedAt}
        freshness={freshness}
        dataSource={metadata.label ?? kpis.label ?? 'Dashboard aggregation API'}
        coverageLabel={metadata.coverageLabel ?? kpis.coverageLabel}
        integrationHealth="healthy"
        aiConfidence={narrative.aiConfidence}
      />
      <ExecutiveNarrative
        happening={narrative.what}
        whyItMatters={narrative.why}
        affectedService={narrative.owner}
        impact={narrative.impact}
        nextAction={{ label: narrative.next, href: narrative.nextHref }}
        aiConfidence={narrative.aiConfidence}
      />
      <div className="mb-4">
        <InlineAiAssist
          title="AI executive brief"
          prompt="Produce a board-ready executive brief: what happened, why, business impact, owners, and recommended actions for OpsEdge360 current posture."
          context={JSON.stringify({ kpis, narrative, metadata })}
        />
      </div>
    </>
  );
}
