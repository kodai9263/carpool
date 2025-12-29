import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";

export function usePinFetcher() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  const fetcher = useMemo(() => {
    return async (url: string) => {
      const pin = sessionStorage.getItem(`pin:${teamId}`) ?? '';

      if (!pin) {
        router.replace(`/member/teams/${teamId}`);
        throw new Error('PINが見つかりません');
      }

      const response = await fetch(url, {
        headers: {
          'x-pin': pin
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          sessionStorage.removeItem(`pin:${teamId}`);
          router.replace(`/member/teams/${teamId}`);
        }
        throw new Error('API呼び出しに失敗しました');
      }

      return response.json();
    };
  }, [teamId, router]);

  return fetcher;
}