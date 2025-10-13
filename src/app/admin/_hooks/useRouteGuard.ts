import { useEffect } from "react";
import { useSupabaseSession } from "../../_hooks/useSupabaseSession";
import { useRouter } from "next/navigation";

export const useRouteGuard = () => {
  const router = useRouter();
  const { session } = useSupabaseSession();

  useEffect(() => {
    if (session === undefined) return // sessionがundefinedの場合は何もしない

    const fetcher = async () => {
      if (session ===  null) {
        router.replace('/login');
      }
    }

    fetcher();
  }, [router, session]);
}