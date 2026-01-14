"use client";

import { api } from "@/utils/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { FormInput } from "../_components/FormInput";
import { FormButton } from "../_components/FormButton";

interface InputValue {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Page() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<InputValue>({
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const router = useRouter();

  const onSubmit = async (data: InputValue) => {
    if (data.password !== data.confirmPassword) {
      alert("パスワードが一致しません。");
      return;
    }

    try {
      await api.post("/api/auth/signup", {
        email: data.email,
        password: data.password,
      });

      alert("確認メールを送信しました。");
      router.push("/login");
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
            会員登録
          </h1>
          <p className="text-center text-sm text-gray-600">
            管理者アカウントを作成します
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

          <FormButton
            label="登録"
            loadingLabel="登録中..."
            isSubmitting={isSubmitting}
          />
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            既にアカウントをお持ちの方は{" "}
            <Link
              href="/login"
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
    </div>
  );
}
