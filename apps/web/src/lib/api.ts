import { cookies } from 'next/headers';
import { AUTH_COOKIE } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function fetchApi<T>(path: string): Promise<T> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${decodeURIComponent(token)}`;

  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers,
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getApiUrl(): string {
  return API_URL;
}
