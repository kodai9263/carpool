import useSWR from "swr";
import { useSupabaseSession } from "./useSupabaseSession";
import { fetcher } from "@/utils/fetcher";

export function useFetch<T>(url: string | null) {
  const { token } = useSupabaseSession();

  // tokenが取得済みの時だけfetchを開始（キーはurlのみ → token更新でキャッシュ無効化されない）
  const { data, error, isLoading, mutate } = useSWR<T>(
    url && token ? url : null,
    fetcher<T>,
    {
      revalidateOnFocus: false,  // タブ切り替え時の再検証を無効化
      dedupingInterval: 2000,    // 2秒以内の重複リクエストを1回にまとめる
      errorRetryCount: 2,        // エラー時のリトライを2回に制限
    }
  );

  return { data, error, isLoading, mutate };
}