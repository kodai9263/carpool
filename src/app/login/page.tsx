"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/FormButton";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "../_components/LoadingSpinner";
import toast from "react-hot-toast";

export default function Page() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  // URLパラメータでguest=trueがある場合、自動でゲストログイン
  useEffect(() => {
    const isGuest = searchParams.get('guest');
    if (isGuest === 'true') {
      setIsGuestLoading(true);
      handleGuestLogin();
    }
  }, [searchParams]);

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        alert("ログインに失敗しました。");
        console.error(error.message);
      } else {
        router.replace("/admin/teams");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "通信エラーが発生しました。";
      alert(message);
      console.error(e);
    }
  };

  const handleGuestLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "guest@carpool.demo",
        password: "guest123456",
      });
      if (error) {
        alert("ゲストログインに失敗しました。");
        console.error(error.message);
        setIsGuestLoading(false);
      } else {
        router.replace("/admin/teams");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "通信エラーが発生しました。";
        alert(message);
        console.error(e);
        setIsGuestLoading(false);
    }
  };

  if (isGuestLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-[#5d9b94] via-[#7fb5ae] to-[#a8cec8] p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            ログイン
          </h1>
          <p className="text-center text-sm text-gray-600">
            管理者アカウントでログイン
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormInput
            label="メールアドレス"
            type="email"
            placeholder="example@mail.com"
            disabled={isSubmitting}
            error={errors.email?.message}
            {...register("email", { required: "メールアドレスは必須です。" })}
          />

          <FormInput
            label="パスワード"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register("password", {
              required: "パスワードを入力してください。",
            })}
          />

          <div className="text-center">
            <Link
              href="/reset-password"
              className="inline-block text-sm text-[#0F766E] hover:text-[#0D6B64] hover:underline underline-offset-2 transition-colors"
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          <FormButton
            label="ログイン"
            loadingLabel="ログイン中..."
            isSubmitting={isSubmitting}
          />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/signup"
              className="text-[#0F766E] hover:text-[#0D6B64] font-medium hover:underline transition-colors"
            >
              こちら
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="flex items-center justify-center text-sm text-gray-600 hover:text-[#0F766E] transition-colors"
          >
            <span>← ホームに戻る</span>
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
