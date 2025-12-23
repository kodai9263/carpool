import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export function useMemberRideAuth(teamId: string, rideId: string) {
  const router = useRouter();

  const pin = typeof window !== 'undefined'
    ? sessionStorage.getItem(`pin:${teamId}`) ?? ''
    : '';

  useEffect(() => { 
    if (!teamId) return;
    const p = sessionStorage.getItem(`pin:${teamId}`);
    if (!p) router.replace(`/member/teams/${teamId}`);
  }, [teamId, router]);

  const url = useMemo(() => {
    return `/api/member/teams/${teamId}/rides/${rideId}?pin=${encodeURIComponent(pin)}`;
  }, [teamId, rideId, pin]);

  return { pin, url };
}