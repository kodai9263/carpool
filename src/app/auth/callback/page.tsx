"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // implicit flow: hashのaccess_tokenをsupabaseが自動的にパースしてセッションを返す
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      // Adminレコードが存在しない場合のみ作成
      await fetch("/api/auth/ensure-admin", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      router.replace("/admin/teams");
    };

    handleCallback();
  }, [router]);

  return <LoadingSpinner />;
}
