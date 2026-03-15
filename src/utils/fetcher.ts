import { api } from "./api";
import { supabase } from "./supabase";

// 常に最新のtokenをSupabaseから取得（Supabaseが内部でリフレッシュ済み）
export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return api.get(url, token) as Promise<T>;
}