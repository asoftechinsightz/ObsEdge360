/** Map technical API failures to evaluator-safe guidance (EDE empty-state rule). */
export function friendlyError(err: unknown, fallback?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/internal server error/i.test(raw) || raw === 'Internal server error') {
    return (
      fallback ??
      'This view is not populated yet. Load the Enterprise Demo pack or connect Discovery — no customer data was lost.'
    );
  }
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return 'Unable to reach the platform API. Check connectivity, then retry.';
  }
  return raw || fallback || 'Something went wrong loading this view.';
}
