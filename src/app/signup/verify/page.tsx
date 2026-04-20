"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import Link from "next/link";

export default function Page() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleResend = async () => {
    setResendStatus("sending");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResendStatus(error ? "error" : "sent");
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-[#5d9b94] via-[#7fb5ae] to-[#a8cec8] p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl text-center">
        <div className="text-5xl mb-6">📧</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          確認メールを送りました
        </h1>
        {email && (
          <p className="text-sm text-gray-500 mb-2 font-medium">{email}</p>
        )}
        <p className="text-sm text-gray-600 mb-2">
          届いたメール内のリンクをクリックして登録を完了してください。
        </p>
        <p className="text-xs text-gray-400 mb-8">
          迷惑メールフォルダも確認してください。
        </p>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 mb-3">メールが届かない場合</p>
          {resendStatus === "sent" ? (
            <p className="text-sm text-[#5d9b94] font-medium">再送しました</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resendStatus === "sending"}
              className="text-sm text-[#0F766E] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendStatus === "sending" ? "送信中..." : "確認メールを再送する"}
            </button>
          )}
          {resendStatus === "error" && (
            <p className="text-xs text-red-500 mt-2">送信に失敗しました。しばらくしてからお試しください。</p>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <Link
            href="/login"
            className="text-sm text-gray-500 hover:text-[#0F766E] transition-colors"
          >
            ログイン画面へ
          </Link>
        </div>
      </div>
      <footer className="mt-6 py-2 text-center text-sm text-white/80">
        お問い合わせ:{" "}
        <a
          href="mailto:carpool.app.2026@gmail.com"
          className="hover:text-white underline"
        >
          carpool.app.2026@gmail.com
        </a>
      </footer>
    </div>
  );
}
