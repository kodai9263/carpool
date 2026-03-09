'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { api } from "@/utils/api";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";

export default function CompleteTransferPage() {
  const router = useRouter();
  const { token, isLoading } = useSupabaseSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !token) return;

    api.post("/api/admin/me/transfer/complete", {}, token)
      .then(() => {
        router.replace("/admin/teams");
      })
      .catch((e: unknown) => {
        const message = (e as { message?: string })?.message ?? "引き継ぎの完了に失敗しました";
        setError(message);
      });
  }, [token, isLoading, router]);

  if (isLoading || (!error && !token)) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-blue-600 underline">ログインページへ</a>
        </div>
      </div>
    );
  }

  return <LoadingSpinner />;
}
