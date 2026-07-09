const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const AUTH_COOKIE = 'oe360_token';

export interface AuthUser {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const err = data as { message?: string | string[]; error?: string };
  if (Array.isArray(err.message)) return err.message.join(', ');
  if (typeof err.message === 'string' && err.message !== 'Internal server error') return err.message;
  if (typeof err.error === 'string') return err.error;
  if (typeof err.message === 'string') return err.message;
  return fallback;
}

export function getApiUrl(): string {
  return API_URL;
}

export function setAuthCookie(token: string, maxAgeDays = 7): void {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
}

export function getAuthTokenFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function loginRequest(email: string, password: string, tenantId?: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, tenantId }),
    });
  } catch {
    throw new Error('Cannot reach API. Start the gateway: npm run dev (port 4000).');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseApiError(data, 'Login failed'));
  return data;
}

export async function signupRequest(
  email: string,
  password: string,
  name: string,
  organizationName: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, organizationName }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, 'Signup failed'));
  return data;
}

export async function forgotPasswordRequest(
  email: string,
  tenantId?: string,
): Promise<{ message: string; resetToken?: string }> {
  const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, tenantId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, 'Unable to request password reset'));
  return data;
}

export async function resetPasswordRequest(token: string, password: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(parseApiError(data, 'Unable to reset password'));
  return data;
}

export function logout(): void {
  clearAuthCookie();
  window.location.href = '/login';
}
