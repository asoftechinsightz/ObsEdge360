import { getApiUrl, getAuthTokenFromDocument, AUTH_COOKIE } from './auth';

function authHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (typeof document !== 'undefined') {
    const token = getAuthTokenFromDocument();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function parseError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const err = data as { error?: string; message?: string | string[] };
  if (typeof err.error === 'string') return err.error;
  if (Array.isArray(err.message)) return err.message.join(', ');
  if (typeof err.message === 'string') return err.message;
  return fallback;
}

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}/api/v1${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseError(data, `Request failed (${res.status})`));
  return data as T;
}

export { AUTH_COOKIE, getApiUrl, getAuthTokenFromDocument };
