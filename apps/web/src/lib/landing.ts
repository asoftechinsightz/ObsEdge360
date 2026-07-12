/** Resolve post-login landing (UX-1E). Presentation routing only. */

const ALLOWED = new Set([
  '/dashboard',
  '/ops-intelligence',
  '/reports',
  '/itsm',
  '/synthetics',
  '/security',
  '/admin',
  '/observability',
  '/apm',
  '/demo/guided',
  '/banking360',
  '/cmdb/drift',
]);

export function roleDefaultLanding(role?: string): string {
  const r = (role || '').toLowerCase();
  if (r.includes('ciso') || r.includes('security')) return '/security';
  if (r.includes('noc') || r.includes('sre') || r.includes('ops')) return '/ops-intelligence';
  if (r.includes('platform_admin')) return '/admin';
  if (r.includes('devops') || r.includes('cloud') || r.includes('cto')) return '/ops-intelligence';
  if (r.includes('cio') || r.includes('executive') || r.includes('business')) return '/dashboard';
  // Buyer-safe default for org admins / owners (demo CIO included)
  if (r.includes('admin') || r.includes('owner')) return '/dashboard';
  return '/dashboard';
}

export function sanitizeLandingPath(path?: string | null): string | null {
  if (!path || typeof path !== 'string') return null;
  const p = path.startsWith('/') ? path : `/${path}`;
  if (!ALLOWED.has(p)) return null;
  return p;
}

/**
 * Priority: explicit redirect query (if not default) → saved preference → role default → /dashboard
 */
export function resolveLandingPath(opts: {
  redirectParam?: string | null;
  savedLanding?: string | null;
  role?: string;
}): string {
  const redirect = opts.redirectParam;
  if (redirect && redirect !== '/dashboard' && redirect.startsWith('/')) {
    return redirect;
  }
  const saved = sanitizeLandingPath(opts.savedLanding);
  if (saved) return saved;
  if (redirect === '/dashboard' || !redirect) {
    return roleDefaultLanding(opts.role);
  }
  return redirect.startsWith('/') ? redirect : '/dashboard';
}
