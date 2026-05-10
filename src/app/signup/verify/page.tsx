"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { ArrowLeft, MailCheck, RefreshCw } from "lucide-react";

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
    <div className="app-page flex flex-col items-center justify-center px-4">
      <div className="app-card relative w-full max-w-md overflow-hidden p-6 text-center md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-emerald-500 to-amber-300" />
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <MailCheck size={30} />
        </div>
        <h1 className="mb-3 text-2xl font-bold tracking-tight text-gray-950">
          確認メールを送りました
        </h1>
        {email && (
          <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">{email}</p>
        )}
        <p className="mb-2 text-sm leading-6 text-gray-600">
          届いたメール内のリンクをクリックして登録を完了してください。
        </p>
        <p className="mb-8 text-xs text-gray-500">
          迷惑メールフォルダも確認してください。
        </p>

        <div className="border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 mb-3">メールが届かない場合</p>
          {resendStatus === "sent" ? (
            <p className="text-sm font-semibold text-teal-700">再送しました</p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === "sending"}
              className="app-button-secondary w-full"
            >
              <RefreshCw size={16} className={resendStatus === "sending" ? "animate-spin" : ""} />
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
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-teal-800"
          >
            <ArrowLeft size={15} />
            ログイン画面へ
          </Link>
        </div>
      </div>
      <footer className="mt-6 py-2 text-center text-sm text-gray-500">
        お問い合わせ:{" "}
        <a
          href="mailto:carpool.app.2026@gmail.com"
          className="underline hover:text-teal-800"
        >
          carpool.app.2026@gmail.com
        </a>
      </footer>
    </div>
  );
}
