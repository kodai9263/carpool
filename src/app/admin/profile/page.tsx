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
import { AlertTriangle, Mail, Send, ShieldCheck, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { token } = useSupabaseSession();
  const { data, isLoading, mutate } = useFetch<AdminMeResponse>('/api/admin/me');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const {
    register: registerTransfer,
    handleSubmit: handleSubmitTransfer,
    watch: watchTransfer,
    formState: { isSubmitting: isTransferring, errors: transferErrors },
  } = useForm<TransferFormValues>();

  const onTransfer = async ({ newEmail }: TransferFormValues) => {
    if (!token) return;
    if (!confirm(
      `「${newEmail}」に引き継ぎメールを送信しますか？`
    )) return;

    try {
      await api.patch("/api/admin/me", { newEmail }, token);
      toast.success("引き継ぎメールを送信しました。メールアドレスを確認してください。");
      // signOut しない → データを再取得して引き継ぎ中バナーを即時表示
      mutate();
    } catch (e: unknown) {
      const message = (e as { message?: string })?.message ?? "エラーが発生しました。";
      toast.error(message);
    }
  };

  const handleCancelTransfer = async () => {
    if (!token) return;
    if (!confirm("引き継ぎをキャンセルしますか？メールアドレスが元に戻ります。")) return;

    try {
      setIsCancelling(true);
      await api.delete("/api/admin/me/transfer", token);
      toast.success("引き継ぎをキャンセルしました。");
      mutate();
    } catch {
      toast.error("キャンセルに失敗しました。");
    } finally {
      setIsCancelling(false);
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
    <div className="app-page min-h-screen px-4 py-8 md:px-8">
      <div className="app-container max-w-3xl">
        <div className="mb-8">
          <p className="mb-1 text-sm font-semibold text-teal-700">Account</p>
          <h1 className="app-section-title">プロフィール</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            ログイン情報と管理者権限の引き継ぎを管理できます。
          </p>
        </div>

        <div className="space-y-5">
          <section className="app-card overflow-hidden">
            <div className="flex items-start gap-4 p-5 md:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Mail size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-500">メールアドレス</p>
                <p className="mt-2 truncate text-lg font-bold text-gray-950">{data?.admin.email}</p>
              </div>
            </div>
          </section>

          {data?.admin.pendingTransferNewEmail ? (
            <section className="app-card border-amber-200 bg-amber-50/80 p-5 md:p-6">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-amber-900">引き継ぎ中</h2>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    <span className="font-semibold">{data.admin.pendingTransferNewEmail}</span> 宛に招待メールを送信しました。
                    新しい担当者がパスワードを設定するまで、このアカウントで引き続きアクセスできます。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelTransfer}
                disabled={isCancelling}
                className="app-button-secondary w-full border-amber-200 bg-white text-amber-800 hover:bg-amber-100"
              >
                {isCancelling ? "キャンセル中..." : "引き継ぎをキャンセルする"}
              </button>
            </section>
          ) : (
            <section className="app-card p-5 md:p-6">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <ShieldCheck size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-950">管理者の引き継ぎ</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    新しい担当者のメールアドレス宛に、パスワード設定用のリンクを送信します。
                  </p>
                </div>
              </div>
              <form onSubmit={handleSubmitTransfer(onTransfer)} className="space-y-4">
                <div>
                  <input
                    type="email"
                    placeholder="新しい担当者のメールアドレス"
                    className="app-input text-sm"
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
                    className="app-input text-sm"
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
                  className="app-button-primary w-full"
                >
                  <Send size={16} />
                  {isTransferring ? "送信中..." : "引き継ぎメールを送る"}
                </button>
              </form>
            </section>
          )}

          <section className="rounded-xl border border-red-100 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle size={21} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-950">アカウントの削除</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  アカウントを削除すると、チーム・メンバー・配車などすべてのデータが完全に削除されます。この操作は取り消せません。
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {isDeleting ? "削除中..." : "アカウントを削除する"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
