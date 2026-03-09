'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { api } from "@/utils/api";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { AdminMeResponse } from "@/app/_types/response/adminResponse";
import { TransferFormValues } from "@/app/_types/admin";

export default function ProfilePage() {
  const router = useRouter();
  const { token } = useSupabaseSession();
  const { data, isLoading } = useFetch<AdminMeResponse>('/api/admin/me');
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register: registerTransfer,
    handleSubmit: handleSubmitTransfer,
    watch: watchTransfer,
    formState: { isSubmitting: isTransferring, errors: transferErrors },
  } = useForm<TransferFormValues>();

  const onTransfer = async ({ newEmail }: TransferFormValues) => {
    if (!token) return;
    if (!confirm(
      `「${newEmail}」に引き継ぎメールを送信しますか？\n送信後、あなたはこのアカウントにアクセスできなくなります。`
    )) return;

    try {
      await api.patch("/api/admin/me", { newEmail }, token);
      toast.success("引き継ぎメールを送信しました。");
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e: unknown) {
      const message = (e as { message?: string })?.message ?? "エラーが発生しました。";
      toast.error(message);
    }
  };

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

        {/* 管理者の引き継ぎ */}
        <div className="mt-6 border border-orange-200 rounded-xl p-5 bg-orange-50">
          <h2 className="text-base font-bold text-orange-700 mb-2">管理者の引き継ぎ</h2>
          <p className="text-sm text-orange-600 mb-4">
            新しい担当者のメールアドレスを入力してください。
            入力したメールアドレス宛にパスワード設定用のリンクが送られます。
            <br />
            送信後、あなたはこのアカウントにアクセスできなくなります。
          </p>
          <form onSubmit={handleSubmitTransfer(onTransfer)} className="space-y-3">
            <div>
              <input
                type="email"
                placeholder="新しい担当者のメールアドレス"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                {...registerTransfer("newEmail", {
                  required: "メールアドレスを入力してください",
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "正しいメールアドレスを入力してください" },
                })}
              />
              {transferErrors.newEmail && (
                <p className="mt-1 text-xs text-red-500">{transferErrors.newEmail.message}</p>
              )}
            </div>
            <div>
              <input
                type="email"
                placeholder="メールアドレス（確認）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                {...registerTransfer("confirmEmail", {
                  required: "確認用メールアドレスを入力してください",
                  validate: (val) => val === watchTransfer("newEmail") || "メールアドレスが一致しません",
                })}
              />
              {transferErrors.confirmEmail && (
                <p className="mt-1 text-xs text-red-500">{transferErrors.confirmEmail.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isTransferring}
              className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isTransferring ? "送信中..." : "引き継ぎメールを送る"}
            </button>
          </form>
        </div>

        <hr className="border-gray-200 mb-8 mt-6" />

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
