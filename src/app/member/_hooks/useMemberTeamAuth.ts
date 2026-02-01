import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function useMemberTeamAuth(teamId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!teamId) return;

    const p = sessionStorage.getItem(`pin:${teamId}`) ?? '';

    if (!p) {
      sessionStorage.setItem(`returnTo:${teamId}`, pathname);
      router.replace(`/member/teams/${teamId}`);
    } else {
      setPin(p);
    }
  }, [teamId, router, pathname]);

  return pin;
}