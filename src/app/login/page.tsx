'use client'

import { supabase } from "@/src/utils/supabase"
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

export default function Page() {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });
  const router = useRouter();

  const onSubmit = async (data: { email: string; password: string}) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      alert('ログインに失敗しました。')
    } else {
      router.replace("/admin/top") //TODO 管理者トップ作成
    }
  };

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
              ログイン
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}