import { useEffect } from "react";
import { useSupabaseSession } from "../../_hooks/useSupabaseSession";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { shouldRequireAdminMfa } from "@/utils/adminMfa";

type RouteGuardOptions = {
  skipMfa?: boolean;
};

export const useRouteGuard = (options: RouteGuardOptions = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSupabaseSession();
  const skipMfa = options.skipMfa === true;

  useEffect(() => {
    if (session === undefined) return // sessionがundefinedの場合は何もしない

    const fetcher = async () => {
      if (session ===  null) {
        router.replace('/login');
        return;
      }

      if (
        skipMfa ||
        pathname === "/admin/security/mfa" ||
        !shouldRequireAdminMfa(session.user.email)
      ) {
        return;
      }

      const nextPath = pathname || "/admin/teams";
      const mfaPath = `/admin/security/mfa?next=${encodeURIComponent(nextPath)}`;
      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError || !factors?.totp?.length) {
        router.replace(mfaPath);
        return;
      }

      const { data: assurance, error: assuranceError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (
        assuranceError ||
        (assurance?.nextLevel === "aal2" &&
          assurance.currentLevel !== "aal2")
      ) {
        router.replace(mfaPath);
      }
    }

    fetcher();
  }, [pathname, router, session, skipMfa]);
}
