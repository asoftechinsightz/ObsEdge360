'use client';

/**
 * @deprecated Wave 2 — use ExecutiveBriefing with dashboard payload props.
 * Kept for backward compatibility; no longer performs API calls.
 */
import type { ExecutiveDashboardPayload, ResponseMetadata } from '@opsedge360/shared-types';
import { ExecutiveBriefing } from '@/components/dashboard/ExecutiveBriefing';

type Props = {
  payload?: ExecutiveDashboardPayload;
  metadata?: ResponseMetadata;
};

export function ExecutiveHomeApex({ payload, metadata }: Props) {
  if (!payload || !metadata) return null;
  return <ExecutiveBriefing payload={payload} metadata={metadata} />;
}
