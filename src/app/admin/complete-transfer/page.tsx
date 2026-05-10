'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { api } from "@/utils/api";
import { supabase } from "@/utils/supabase";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { AlertCircle, LockKeyhole, ShieldCheck } from "lucide-react";

export default function CompleteTransferPage() {
  const router = useRouter();
  const { token, isLoading } = useSupabaseSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("パスワードが一致しません");
      return;
    }
    if (!token) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. パスワードを設定
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error("パスワードの設定に失敗しました");

      // 2. 引き継ぎ完了（Admin レコードを新担当者に更新し、旧ユーザーを削除）
      await api.post("/api/admin/me/transfer/complete", {}, token);
      router.replace("/admin/teams");
    } catch (e: unknown) {
      const message = (e as { message?: string })?.message ?? "引き継ぎの完了に失敗しました";
      setError(message);
      setIsSubmitting(false);
    }
  };

  if (isLoading || (!error && !token)) return <LoadingSpinner />;

  return (
    <div className="app-page flex min-h-screen items-center justify-center px-4">
      <div className="app-card relative w-full max-w-md overflow-hidden p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-emerald-500 to-amber-300" />
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <ShieldCheck size={30} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">管理者引き継ぎ</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            ログインに使用するパスワードを設定してください。
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <LockKeyhole size={17} className="text-gray-500" />
              新しいパスワード
            </span>
            <input
              type="password"
              placeholder="8文字以上"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="app-input text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <LockKeyhole size={17} className="text-gray-500" />
              パスワード（確認）
            </span>
            <input
              type="password"
              placeholder="もう一度入力"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="app-input text-sm"
            />
          </label>
          {error && (
            <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="app-button-primary w-full"
          >
            {isSubmitting ? "設定中..." : "パスワードを設定して引き継ぎを完了する"}
          </button>
        </form>
      </div>
    </div>
  );
}
