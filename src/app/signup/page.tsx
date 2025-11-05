'use client';

import { api } from "@/utils/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/Formbutton";

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
          <FormInput 
            label="メールアドレス"
            name="email"
            type="email"
            placeholder="example@mail.com"
            disabled={isSubmitting}
            register={register}
            rules={{ required: "メールアドレスは必須です。" }}
          />

          <FormInput 
            label="パスワード"
            name="password"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            register={register}
            rules={{ required: "パスワードを入力してください。" }}
          />

          <FormInput 
            label="パスワード(確認)"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            disabled={isSubmitting}
            register={register}
            rules={{ required: "確認用のパスワードを入力してください。" }}
          />

          <FormButton 
            label="登録"
            loadingLabel="登録中..."
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