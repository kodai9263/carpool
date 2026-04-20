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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

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

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">または</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="mt-4 w-full flex items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Googleでログイン
          </button>
        </div>

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
