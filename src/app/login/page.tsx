'use client'

import { supabase } from "@/src/utils/supabase"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

export default function Page() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });
  const [disable, setDisable] = useState(false);
  const router = useRouter();

  const onSubmit = async (data: { email: string; password: string}) => {
    setDisable(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
      });
      if (error) {
        alert('ログインに失敗しました。')
        console.error(error.message);
      } else {
        router.replace("/admin/top") //TODO 管理者トップ作成
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
      console.error('予期せぬエラー', e.message);
      } else {
        console.error('予期せぬエラー', e);
      }
      alert('通信エラーが発生しました。時間をおいて再度お試しください。');
    } finally {
      setDisable(false);
    }
  }  

  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label 
              htmlFor="email"
              className="block text-sm font-medium mb-2"
            >
              メールアドレス
            </label>
            <input 
              {...register("email", {
                required: "メールアドレスは必須です。"
              })}
              type="email"
              name="email"
              id="email"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              placeholder="example@mail.com"
              disabled={disable}
            />
          </div>
          <div>
            <label 
              htmlFor="password"
              className="block text-sm font-medium mb-2"
            >
              パスワード
            </label>
            <input 
              {...register("password", {
                required: "passwordを入力してください。"
              })}
              type="password"
              name="password"
              id="password"
              placeholder="•••••••"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              disabled={disable}
            />
          </div>

          <div className="text-center">
            <Link
              href="/reset-password"
              className="inline-block text-teal-700 hover:underline underline-offset-2 focus:outline-none focus-visible:underline"
            >
              パスワードをお忘れですか？
            </Link>
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-teal-700 text-white py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              {disable ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}