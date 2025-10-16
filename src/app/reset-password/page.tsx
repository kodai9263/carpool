'use client';

import { supabase } from "@/src/utils/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";

type Phase = 'request' | 'reset';

interface FormInput {
  email: string;
  password: string;
}

export default function Page() {
  const [disable, setDisable] = useState(false);
  const [phase, setPhase] = useState<Phase>('request');
  const router = useRouter();
  const {register, handleSubmit, reset } =useForm<FormInput>({
    defaultValues: { email: '', password: ''},
  });

  // パスワード再設定メールのリンク経由で戻ったとき、Supabase が "PASSWORD_RECOVERY" イベントを発火するので、パスワード入力フェーズへ切り替える
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setPhase('reset');
    });
    return () => subscription.unsubscribe();
  }, []);

  // メール内リンクの戻り先URLを決める
  const siteUrl = 
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const redirectUrl = new URL('/reset-password', siteUrl).toString();

  // 送信処理（フェーズで処理を分岐）
  const onSubmit: SubmitHandler<FormInput> = async ({ email, password }) => {
    setDisable(true);
    try {
      if (phase === 'request') {
        // フェーズ1: 再設定メール送信
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl, // メールのリンク先
        });
        if (error) throw error;
        alert('パスワード再設定用のメールを送信しました。');
        reset({ email: '', password: ""}); //入力をクリア
      } else {
        // フェーズ2: 新しいパスワードに更新
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        alert('パスワードを更新しました。ログインしてください。');
        router.push('/login');
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error('予期せぬエラー', e.message);
      } else {
        console.error('予期せぬエラー', e);
      }
    } finally {
      setDisable(false);
    }
  }

  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">パスワード再設定</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {phase === 'request' ? (
            <div>
              <label 
                htmlFor="email"
                className="block text-sm font-medium mb-2"
              >
                メールアドレス
              </label>
              <input 
                type="email"
                id="email"
                className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
                placeholder="example@mail.com"
                required
                disabled={disable}
                {...register('email', { required: true })}
              />
            </div>
          ) : (
            <div>
              <label 
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                新しいパスワード
              </label>
              <input 
                type="password"
                id="password"
                placeholder="••••••••"
                className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
                required
                disabled={disable}
                {...register('password', { required: true })}
              />
            </div>
          )}
          
          <div>
            <button
              type="submit"
              className="w-full bg-teal-700 text-white py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              {disable ? '送信中...' : phase === 'request' ? 'メールを送信' : 'パスワードを更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}