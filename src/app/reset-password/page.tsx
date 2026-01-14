"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/FormButton";

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
        alert("パスワード再設定用のメールを送信しました。");
        reset({ email: "", password: "", confirmPassword: "" }); //入力をクリア
      } else {
        // フェーズ2: パスワードチェックをクリアした後、新しいパスワードに更新
        if (password !== confirmPassword) {
          alert("パスワードが一致しません。");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        alert("パスワードを更新しました。ログインしてください。");
        router.push("/login");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "通信エラーが発生しました。";
      alert(message);
      console.error(e);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-[#5d9b94] via-[#7fb5ae] to-[#a8cec8] p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            パスワード再設定
          </h1>
          <p className="text-center text-sm text-gray-600">
            {phase === "request"
              ? "登録メールアドレスに再設定用のリンクを送信します"
              : "新しいパスワードを設定してください"}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {phase === "request" ? (
            <FormInput
              label="メールアドレス"
              type="email"
              placeholder="example@mail.com"
              disabled={isSubmitting}
              error={errors.email?.message}
              {...register("email", { required: "メールアドレスは必須です。" })}
            />
          ) : (
            <div className="space-y-4">
              <FormInput
                label="新しいパスワード"
                type="password"
                placeholder="••••••••"
                disabled={isSubmitting}
                error={errors.password?.message}
                {...register("password", {
                  required: "パスワードを入力してください。",
                })}
              />

              <FormInput
                label="パスワード(確認)"
                type="password"
                placeholder="••••••••"
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
          />
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex justify-center gap-6">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-[#0F766E] transition-colors"
            >
              ← ログインに戻る
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-[#0F766E] transition-colors"
            >
              ホームに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
