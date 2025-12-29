import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useMemberRideAuth(teamId: string, rideId: string) {
  const router = useRouter();
  const [pin, setPin] = useState('');

  useEffect(() => { 
    if (!teamId) return;

    const p = sessionStorage.getItem(`pin:${teamId}`) ?? '';

    if (!p) {
      router.replace(`/member/teams/${teamId}`);
    } else {
      setPin(p);
    }
  }, [teamId, router]);

  const url = `/api/member/teams/${teamId}/rides/${rideId}`;

  return { pin, url };
}