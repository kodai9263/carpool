"use client";

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/FormButton";
import { useCallback, useEffect, useState } from "react";
import { LoadingSpinner } from "../_components/LoadingSpinner";
import { AlertCircle, ArrowLeft, Car, LockKeyhole, Mail } from "lucide-react";

export default function Page() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGuestLoading, setIsGuestLoading] = useState(false);

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
        setError("root", {
          type: "manual",
          message: "メールアドレスまたはパスワードを確認してください。",
        });
        console.error(error.message);
      } else {
        router.replace("/admin/teams");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "通信エラーが発生しました。";
      setError("root", { type: "manual", message });
      console.error(e);
    }
  };

  const handleGuestLogin = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: "guest@carpool.demo",
        password: "guest123456",
      });
      if (error) {
        setError("root", {
          type: "manual",
          message: "ゲストログインに失敗しました。時間をおいて再度お試しください。",
        });
        console.error(error.message);
        setIsGuestLoading(false);
      } else {
        router.replace("/admin/teams");
      }
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "通信エラーが発生しました。";
        setError("root", { type: "manual", message });
        console.error(e);
        setIsGuestLoading(false);
    }
  }, [router, setError]);

  // URLパラメータでguest=trueがある場合、自動でゲストログイン
  useEffect(() => {
    const isGuest = searchParams.get('guest');
    if (isGuest === 'true') {
      setIsGuestLoading(true);
      handleGuestLogin();
    }
  }, [handleGuestLogin, searchParams]);

  if (isGuestLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="app-page flex min-h-dvh flex-col items-center justify-start px-4 py-4 sm:justify-center md:py-10">
      <Link href="/" className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight text-gray-950">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-gradient-to-br from-teal-700 via-teal-700 to-teal-900 text-white shadow-[0_14px_32px_rgba(15,118,110,0.24)]">
          <Car size={20} strokeWidth={2.35} />
        </span>
        <span className="bg-gradient-to-br from-[#153f3b] to-[#2b7a70] bg-clip-text text-transparent">Carpool</span>
      </Link>
      <div className="app-card relative w-full max-w-md overflow-hidden p-4 sm:p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-emerald-500 to-amber-300" />
        <div className="mb-5 text-center md:mb-8">
          <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">
            ログイン
          </h1>
          <p className="text-sm text-gray-500">
            管理者アカウントでログイン
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          {errors.root?.message && (
            <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{errors.root.message}</p>
            </div>
          )}

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

          <FormInput
            label="パスワード"
            icon={<LockKeyhole size={18} />}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isSubmitting}
            error={errors.password?.message}
            {...register("password", {
              required: "パスワードを入力してください。",
            })}
          />

          <div className="text-center">
            <Link
              href="/reset-password"
              className="inline-block text-xs font-medium text-teal-700 transition-colors hover:text-teal-900 hover:underline underline-offset-2 md:text-sm"
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          <FormButton
            label="ログイン"
            loadingLabel="ログイン中..."
            isSubmitting={isSubmitting}
            className="w-full"
          />
        </form>

        <div className="mt-4 md:mt-6">
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
            className="app-button-secondary mt-3 w-full md:mt-4"
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

        <div className="mt-4 text-center md:mt-6">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link
              href="/signup"
              className="font-semibold text-teal-700 transition-colors hover:text-teal-900 hover:underline"
            >
              こちら
            </Link>
          </p>
        </div>

        <div className="mt-5 border-t border-gray-200 pt-4 max-[700px]:hidden md:mt-8 md:pt-6">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-teal-800"
          >
            <ArrowLeft size={15} />
            <span>ホームに戻る</span>
          </Link>
        </div>
      </div>
      <footer className="mt-6 py-2 text-center text-sm text-gray-500 max-[700px]:hidden">
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
