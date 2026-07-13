import { cookies } from 'next/headers';
import type { ApiEnvelope, ExecutiveDashboardPayload, ResponseMetadata } from '@opsedge360/shared-types';
import { AUTH_COOKIE } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export type DashboardFetchResult = {
  data: ExecutiveDashboardPayload;
  metadata: ResponseMetadata;
  requestId: string;
  apiDurationMs: number;
  cacheHit: boolean;
};

function readRoleFromToken(): string {
  const token = cookies().get(AUTH_COOKIE)?.value;
  if (!token) return 'cio';
  try {
    const payload = JSON.parse(atob(decodeURIComponent(token).split('.')[1]));
    const role = String(payload.role ?? 'cio').toLowerCase();
    if (['cio', 'ciso', 'noc', 'soc', 'admin', 'operations', 'auditor'].includes(role)) return role;
    if (role === 'owner') return 'admin';
    return 'cio';
  } catch {
    return 'cio';
  }
}

/** Single authoritative fetch for Executive Home — Wave 2. */
export async function fetchDashboardExecutive(role?: string): Promise<DashboardFetchResult> {
  const started = Date.now();
  const token = cookies().get(AUTH_COOKIE)?.value;
  const headers: HeadersInit = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${decodeURIComponent(token)}`;

  const effectiveRole = role ?? readRoleFromToken();
  const res = await fetch(
    `${API_URL}/api/v1/dashboard/executive?role=${encodeURIComponent(effectiveRole)}`,
    { headers, cache: 'no-store' },
  );

  if (!res.ok) {
    throw new Error(`Dashboard API error: ${res.status}`);
  }

  const envelope = (await res.json()) as ApiEnvelope<ExecutiveDashboardPayload>;
  if (!envelope.success || !envelope.data) {
    const msg = envelope.errors?.[0]?.message ?? 'Dashboard aggregation failed';
    throw new Error(msg);
  }

  return {
    data: envelope.data,
    metadata: envelope.metadata ?? { generatedAt: envelope.timestamp },
    requestId: envelope.requestId,
    apiDurationMs: Date.now() - started,
    cacheHit: Boolean(envelope.metadata?.cacheHit),
  };
}
