'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setAuthCookie } from '@/lib/auth';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const redirect = params.get('redirect') || '/dashboard';
    const err = params.get('error');
    if (err) {
      setError(err);
      return;
    }
    if (!token) {
      setError('Missing SSO token');
      return;
    }
    setAuthCookie(token);
    router.replace(redirect);
    router.refresh();
  }, [params, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-300">
          SSO failed: {error}
          <div className="mt-3">
            <a href="/login" className="text-primary hover:underline">Back to login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface text-slate-400">
      Completing sign-in…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
