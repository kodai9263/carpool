import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function useMemberRideAuth(teamId: string, rideId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [pin, setPin] = useState('');

  useEffect(() => { 
    if (!teamId) return;

    const p = sessionStorage.getItem(`pin:${teamId}`) ?? '';

    if (!p) {
      // 現在のパスを保存してからリダイレクト
      sessionStorage.setItem(`returnTo:${teamId}`, pathname);
      router.replace(`/member/teams/${teamId}`);
    } else {
      setPin(p);
    }
  }, [teamId, router, pathname]);

  const url = `/api/member/teams/${teamId}/rides/${rideId}`;

  return { pin, url };
}