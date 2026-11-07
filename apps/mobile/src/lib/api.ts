import { env } from './config';
import { requireMobileWriteAccess } from './mobile-write-access';
import type { PurchasePayload } from './purchases';

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

export function adminGet<T>(path: string, token: string, options?: Pick<RequestInit, 'signal' | 'cache'>) {
  return request<T>(path, token, { ...options, method: 'GET' });
}

export async function adminPost<TResponse, TBody>(path: string, token: string, body: TBody) {
  requireMobileWriteAccess(token);
  return request<TResponse>(path, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function adminPut<TResponse, TBody>(path: string, token: string, body: TBody) {
  requireMobileWriteAccess(token);
  return request<TResponse>(path, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function publicPost<TResponse>(path: string, token: string) {
  return request<TResponse>(path, token, { method: 'POST' });
}

// アカウント削除は未契約・失効中も可能。削除先は本人のアカウントに固定する。
export async function deleteAccount(token: string) {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 30000);
  try {
    return await request<{ status: 'OK' }>('/api/admin/me', token, {
      method: 'DELETE', signal: abort.signal,
    });
  } finally { clearTimeout(timeout); }
}

// 未契約ユーザーの購入・復元も受け付ける専用経路。通常の保存処理の制限は外さない。
export async function verifyApplePurchase(token: string, purchase: PurchasePayload) {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 30000);
  try {
    return await request<{ status: 'OK'; mobileAccess: boolean }>('/api/admin/billing/apple/transactions', token, {
      method: 'POST', body: JSON.stringify(purchase), signal: abort.signal,
    });
  } finally { clearTimeout(timeout); }
}
