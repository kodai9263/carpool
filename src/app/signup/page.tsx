'use client';

import { api } from "@/utils/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

interface InputValue {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Page() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<InputValue>({
    defaultValues: { email: '', password: '', confirmPassword: '' }
  });

  const router = useRouter();

  const onSubmit = async (data: InputValue) => {

    if (data.password !== data.confirmPassword) {
      alert('パスワードが一致しません。');
      return;
    }

    try {
      await api.post(
        '/api/auth/signup',
        { email: data.email, password: data.password },
      );
      
      alert('確認メールを送信しました。');
      router.push('/login');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '通信エラーが発生しました。';
      alert(message);
      console.error(e);
    }
  };

  return (
    <div className="flex justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 rounded-xl">
        <h1 className="text-2xl font-bold text-center mb-8">会員登録</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              {...register("email", { required: true })}
              disabled={isSubmitting}
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
              type="password"
              id="password"
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              {...register("password", { required: true })}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label 
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-2"
            >
              パスワード(確認)
            </label>
            <input 
              type="password"
              id="confirmPassword"
              placeholder="••••••••"
              className="w-full rounded-lg px-4 py-2 border-none bg-white/70 focus:ring-2 focus:ring-[#356963]"
              {...register("confirmPassword", { required: true })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-teal-700 text-white mt-4 py-2 px-4 rounded-md hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors"
            >
              {isSubmitting ? '登録中...' : '登録'}
            </button>
          </div>
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