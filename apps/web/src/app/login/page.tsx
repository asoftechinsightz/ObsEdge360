'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState, Suspense } from 'react';
import {
  getApiUrl,
  isMfaChallenge,
  loginRequest,
  mfaVerifyRequest,
  setAuthCookie,
} from '@/lib/auth';
import { resolveLandingPath, roleDefaultLanding } from '@/lib/landing';
import { apiClient } from '@/lib/api-client';

interface SsoProvider {
  id: string;
  name: string;
  protocol: 'oidc' | 'saml';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [providers, setProviders] = useState<SsoProvider[]>([]);
  const [globalOidc, setGlobalOidc] = useState(false);
  const [error, setError] = useState(searchParams.get('error') || '');
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!orgSlug.trim()) {
      setProviders([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `${getApiUrl()}/api/v1/auth/sso/providers?tenant=${encodeURIComponent(orgSlug.trim())}`,
        );
        const data = await res.json();
        setProviders(data.providers || []);
        setGlobalOidc(!!data.globalOidc);
      } catch {
        setProviders([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [orgSlug]);

  useEffect(() => {
    fetch(`${getApiUrl()}/api/v1/auth/sso/providers`)
      .then((r) => r.json())
      .then((d) => setGlobalOidc(!!d.globalOidc))
      .catch(() => undefined);
  }, []);

  async function finishSession(
    accessToken: string,
    extras?: { passwordMustRotate?: boolean; mustEnrollMfa?: boolean; role?: string },
  ) {
    setAuthCookie(accessToken);
    if (extras?.mustEnrollMfa) {
      router.push('/security?enroll=1');
    } else if (extras?.passwordMustRotate) {
      router.push('/security?rotate=1');
    } else {
      let savedLanding: string | null = null;
      try {
        const prefs = await apiClient<{ landing_path?: string; landingPath?: string }>('/me/preferences');
        savedLanding = prefs.landing_path || prefs.landingPath || null;
      } catch {
        /* preferences optional at login */
      }
      let roleHint = extras?.role;
      try {
        roleHint = roleHint || localStorage.getItem('oe360_role_hint') || undefined;
      } catch {
        /* ignore */
      }
      const dest = resolveLandingPath({
        redirectParam: redirect,
        savedLanding,
        role: roleHint || roleDefaultLanding(extras?.role),
      });
      router.push(dest);
    }
    router.refresh();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (mfaToken) {
        const result = await mfaVerifyRequest(mfaToken, mfaCode);
        await finishSession(result.accessToken, {
          passwordMustRotate: result.passwordMustRotate,
          mustEnrollMfa: result.mustEnrollMfa,
          role: result.user?.role,
        });
        return;
      }
      const result = await loginRequest(email, password, orgSlug || undefined);
      if (isMfaChallenge(result)) {
        setMfaToken(result.mfaToken);
        setNotice('Enter the 6-digit code from your authenticator app (or a backup code).');
        return;
      }
      await finishSession(result.accessToken, {
        passwordMustRotate: result.passwordMustRotate,
        mustEnrollMfa: result.mustEnrollMfa,
        role: result.user?.role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function startSso(provider: SsoProvider) {
    if (!orgSlug.trim()) {
      setError('Enter your organization slug for SSO');
      return;
    }
    const path = provider.protocol === 'saml' ? 'saml/start' : 'oidc/start';
    const url =
      `${getApiUrl()}/api/v1/auth/sso/${path}` +
      `?tenant=${encodeURIComponent(orgSlug.trim())}` +
      `&providerId=${encodeURIComponent(provider.id)}` +
      `&redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  }

  function startGlobalOidc() {
    const url =
      `${getApiUrl()}/api/v1/auth/sso/oidc/start` +
      `?redirect=${encodeURIComponent(redirect)}`;
    window.location.href = url;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-surface-elevated p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-white">O</div>
          <div>
            <h1 className="text-lg font-semibold">OpsEdge360</h1>
            <p className="text-sm text-slate-400">
              {mfaToken ? 'Multi-factor authentication' : 'Sign in to your organization'}
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
              {notice}
            </div>
          )}
          {!mfaToken ? (
            <>
              <div>
                <label className="mb-1 block text-sm text-slate-400" htmlFor="org">Organization slug (for SSO)</label>
                <input
                  id="org"
                  value={orgSlug}
                  onChange={(e) => setOrgSlug(e.target.value)}
                  placeholder="acme"
                  className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-sm text-slate-400" htmlFor="mfa">Authenticator or backup code</label>
              <input
                id="mfa"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full rounded-lg border border-slate-600 bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                className="mt-2 text-xs text-slate-400 underline"
                onClick={() => {
                  setMfaToken('');
                  setMfaCode('');
                  setNotice('');
                }}
              >
                Back to password
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mfaToken ? 'Verify MFA' : 'Sign in'}
          </button>
        </form>

        {!mfaToken && (providers.length > 0 || globalOidc) && (
          <div className="mt-6 space-y-2 border-t border-slate-700 pt-6">
            <p className="text-center text-xs text-slate-500">Or continue with SSO</p>
            {globalOidc && (
              <button
                type="button"
                onClick={startGlobalOidc}
                className="w-full rounded-lg border border-slate-600 py-2 text-sm hover:bg-slate-800"
              >
                Enterprise OIDC
              </button>
            )}
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => startSso(p)}
                className="w-full rounded-lg border border-slate-600 py-2 text-sm hover:bg-slate-800"
              >
                {p.name} <span className="text-xs text-slate-500">({p.protocol.toUpperCase()})</span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
        </p>
        <p className="mt-4 text-center text-sm text-slate-400">
          No account?{' '}
          <Link href="/signup" className="text-primary hover:underline">Create organization</Link>
        </p>
        <p className="mt-2 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
