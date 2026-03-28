import { api } from "./api";
import { supabase } from "./supabase";

// アクセストークンを55分キャッシュ（有効期限60分に対して余裕を持たせる）
let cachedToken: string | undefined;
let cacheExpiresAt = 0;

// SWRリクエストのたびにgetSession()を呼ばないようキャッシュを活用
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const now = Date.now();
  if (!cachedToken || now >= cacheExpiresAt) {
    const { data: { session } } = await supabase.auth.getSession();
    cachedToken = session?.access_token;
    cacheExpiresAt = now + 55 * 60 * 1000; // 55分
  }
  return api.get(url, cachedToken) as Promise<T>;
};