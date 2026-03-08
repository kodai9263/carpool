'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { api } from "@/utils/api";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

interface AdminMeResponse {
  status: 'OK';
  admin: { id: number, email: string };
}

export default function ProfilePage() {
  const router = useRouter();
  const { token } = useSupabaseSession();
  const { data, isLoading } = useFetch<AdminMeResponse>('/api/admin/me');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm("本当にアカウントを削除しますか？\nチーム・メンバー・配車などすべてのデータが削除されます。この操作は取り消せません。");
    if (!confirmed || !token) return;

    try {
      setIsDeleting(true);
      await api.delete('/api/admin/me', token);
      await supabase.auth.signOut();
      toast.success("アカウントを削除しました");
      router.replace('/login');
    } catch {
      toast.error("削除に失敗しました。もう一度お試しください。");
      setIsDeleting(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <h1 className="text-2xl font-bold mb-8">プロフィール</h1>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-600 mb-1">メールアドレス</label>
          <p className="text-lg text-gray-800 bg-gray-50 px-4 py-3 rounded-lg">{data?.admin.email}</p>
        </div>

        <hr className="border-gray-200 mb-8" />

        <div className="border border-red-200 rounded-xl p-5 bg-red-50">
          <h2 className="text-base font-bold text-red-700 mb-2">アカウントの削除</h2>
          <p className="text-sm text-red-600 mb-4">
            アカウントを削除すると、チーム・メンバー・配車などすべてのデータが完全に削除されます。この操作は取り消せません。
          </p>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? "削除中..." : "アカウントを削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
