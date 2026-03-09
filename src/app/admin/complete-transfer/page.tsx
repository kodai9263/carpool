'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { api } from "@/utils/api";
import { supabase } from "@/utils/supabase";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";

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
    <div className="min-h-screen flex justify-center items-center px-4">
      <div className="w-full max-w-[400px] p-8 rounded-xl shadow-lg bg-white">
        <h1 className="text-xl font-bold mb-2">管理者引き継ぎ</h1>
        <p className="text-sm text-gray-600 mb-6">
          ログインに使用するパスワードを設定してください。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="新しいパスワード（8文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="パスワード（確認）"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? "設定中..." : "パスワードを設定して引き継ぎを完了する"}
          </button>
        </form>
      </div>
    </div>
  );
}
