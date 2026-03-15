import useSWR from "swr";
import { useSupabaseSession } from "./useSupabaseSession";
import { fetcher } from "@/utils/fetcher";

export function useFetch<T>(url: string | null) {
  const { token } = useSupabaseSession();

  // tokenが取得済みの時だけfetchを開始（キーはurlのみ → token更新でキャッシュ無効化されない）
  const { data, error, isLoading, mutate } = useSWR<T>(
    url && token ? url : null,
    fetcher<T>
  );

  return { data, error, isLoading, mutate };
}