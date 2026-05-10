"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/FormButton";
import toast from "react-hot-toast";
import { AlertCircle, ArrowLeft, Car, LockKeyhole, Mail } from "lucide-react";

type Phase = "request" | "reset";

interface FormInput {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Page() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
    reset,
  } = useForm<FormInput>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const [phase, setPhase] = useState<Phase>("request");
  const router = useRouter();

  // パスワード再設定メールのリンク経由で戻ったとき、Supabase が "PASSWORD_RECOVERY" イベントを発火するので、パスワード入力フェーズへ切り替える
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPhase("reset");
    });
    return () => subscription.unsubscribe();
  }, []);

  // 送信処理（フェーズで処理を分岐）
  const onSubmit: SubmitHandler<FormInput> = async ({
    email,
    password,
    confirmPassword,
  }) => {
    try {
      if (phase === "request") {
        // フェーズ1: 再設定メール送信
        // メール内リンクの戻り先URLを決める
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const redirectUrl = new URL("/reset-password", siteUrl).toString();

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl, // メールのリンク先
        });
        if (error) throw error;
        toast.success("パスワード再設定用のメールを送信しました。");
        reset({ email: "", password: "", confirmPassword: "" }); //入力をクリア
      } else {
        // フェーズ2: パスワードチェックをクリアした後、新しいパスワードに更新
        if (password !== confirmPassword) {
          setError("confirmPassword", {
            type: "manual",
            message: "パスワードが一致しません。",
          });
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("パスワードを更新しました。ログインしてください。");
        router.push("/login");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "通信エラーが発生しました。";
      setError("root", { type: "manual", message });
      console.error(e);
    }
  };

  return (
    <div className="app-page flex flex-col items-center justify-center px-4">
      <Link href="/" className="mb-6 flex items-center gap-2.5 text-lg font-bold tracking-tight text-gray-950">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/70 bg-gradient-to-br from-teal-700 via-teal-700 to-teal-900 text-white shadow-[0_14px_32px_rgba(15,118,110,0.24)]">
          <Car size={21} strokeWidth={2.35} />
        </span>
        <span className="bg-gradient-to-br from-[#153f3b] to-[#2b7a70] bg-clip-text text-transparent">Carpool</span>
      </Link>
      <div className="app-card relative w-full max-w-md overflow-hidden p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-emerald-500 to-amber-300" />
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">
            パスワード再設定
          </h1>
          <p className="text-sm leading-6 text-gray-500">
            {phase === "request"
              ? "登録メールアドレスに再設定用のリンクを送信します"
              : "新しいパスワードを設定してください"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root?.message && (
            <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{errors.root.message}</p>
            </div>
          )}

          {phase === "request" ? (
            <FormInput
              label="メールアドレス"
              icon={<Mail size={18} />}
              type="email"
              placeholder="example@mail.com"
              autoComplete="email"
              disabled={isSubmitting}
              error={errors.email?.message}
              {...register("email", { required: "メールアドレスは必須です。" })}
            />
          ) : (
            <div className="space-y-4">
              <FormInput
                label="新しいパスワード"
                icon={<LockKeyhole size={18} />}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                error={errors.password?.message}
                helperText="8文字以上を推奨します。"
                {...register("password", {
                  required: "パスワードを入力してください。",
                })}
              />

              <FormInput
                label="パスワード(確認)"
                icon={<LockKeyhole size={18} />}
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                disabled={isSubmitting}
                error={errors.confirmPassword?.message}
                {...register("confirmPassword", {
                  required: "確認用のパスワードを入力してください。",
                })}
              />
            </div>
          )}

          <FormButton
            label={phase === "request" ? "メールを送信" : "パスワードを更新"}
            loadingLabel="送信中..."
            isSubmitting={isSubmitting}
            className="w-full"
          />
        </form>

        <div className="mt-8 border-t border-gray-200 pt-6">
          <div className="flex justify-center gap-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-teal-800"
            >
              <ArrowLeft size={15} />
              ログインに戻る
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-teal-800"
            >
              ホームに戻る
            </Link>
          </div>
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
