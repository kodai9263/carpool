'use client'

import { supabase } from "@/utils/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/Formbutton";

export default function Page() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { email: '', password: '' }
  });
  const router = useRouter();

  const onSubmit = async (data: { email: string; password: string}) => {

    try {
      const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
      });
      if (error) {
        alert('ログインに失敗しました。')
        console.error(error.message);
      } else {
        router.replace("/admin/teams")
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '通信エラーが発生しました。';
      alert(message);
      console.error(e);
    }
  }  

  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormInput 
            label="メールアドレス"
            type="email"
            placeholder="example@mail.com"
            disabled={isSubmitting}
            {...register("email", { required: "メールアドレスは必須です。" })}
          />

          <FormInput 
            label="パスワード"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            {...register("password", { required: "パスワードを入力してください。" })}
          />

          <div className="text-center">
            <Link
              href="/reset-password"
              className="inline-block text-teal-700 hover:underline underline-offset-2 focus:outline-none focus-visible:underline"
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

        <Link
          href="/"
          className="text-center block mt-6 text-sm text-gray-700 hover:underline"
          >
            ホームに戻る
          </Link>
      </div>
    </div>
  );
}