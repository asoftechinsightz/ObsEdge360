'use client';

import { useEffect, useState } from 'react';
import { getApiUrl } from '@/lib/auth';

type EnvInfo = {
  appEnv?: string;
  environmentLabel?: string;
  isDemo?: boolean;
  outboundDisabled?: boolean;
};

export function EnvironmentBanner() {
  const [env, setEnv] = useState<EnvInfo | null>(null);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/v1/platform/environment`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setEnv(d))
      .catch(() => undefined);
  }, []);

  if (!env?.appEnv || env.appEnv === 'production') return null;

  const demo = !!env.isDemo;
  return (
    <div
      role="status"
      className={
        demo
          ? 'border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-100'
          : 'border-b border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-center text-xs text-sky-100'
      }
    >
      <strong>{env.environmentLabel || env.appEnv}</strong>
      {demo && ' — demonstration data only. External notifications and production webhooks are disabled.'}
      {!demo && env.outboundDisabled ? ' — outbound integrations restricted.' : null}
      {!demo && !env.outboundDisabled ? ` — APP_ENV=${env.appEnv}` : null}
    </div>
  );
}
