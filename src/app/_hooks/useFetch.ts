import useSWR from "swr";
import { useSupabaseSession } from "./useSupabaseSession";
import { fetcher } from "@/utils/fetcher";

export function useFetch<T>(url: string | null) {
  const { token } = useSupabaseSession();

  const { data, error, isLoading } = useSWR<T>(
    url && token ? [url, token] : null,
    ([url, token]: [string, string]) => fetcher<T>(url, token)
  );

  return { data, error, isLoading };
}