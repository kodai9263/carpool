import { env } from '@/lib/config';

type ApiError = Error & { status?: number };

function buildUrl(path: string) {
  return `${env.apiBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    const error = new Error(json.message ?? json.error ?? '通信に失敗しました。') as ApiError;
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function adminGet<T>(path: string, token: string) {
  return request<T>(path, token, { method: 'GET' });
}

export function adminPost<TResponse, TBody>(path: string, token: string, body: TBody) {
  return request<TResponse>(path, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function publicPost<TResponse>(path: string, token: string) {
  return request<TResponse>(path, token, { method: 'POST' });
}
