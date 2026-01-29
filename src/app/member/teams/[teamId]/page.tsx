"use client";

import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

interface PinValues {
  pin: string;
}

export default function Page() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    reset,
  } = useForm<PinValues>();

  const onSubmit = async (data: PinValues) => {
    const p = data.pin.trim();

    try {
      const response = await fetch(`/api/member/teams/${teamId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: p }),
      });

      if (!response.ok) {
        alert("配車コードが正しくありません");
        reset();
        return;
      }

      sessionStorage.setItem(`pin:${teamId}`, p);
      router.push(`/member/teams/${teamId}/rides`);
    } catch {
      alert("エラーが発生しました");
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-[#5d9b94] via-[#7fb5ae] to-[#a8cec8] p-4">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            配車閲覧
          </h1>
          <p className="text-center text-sm text-gray-600">
            配車閲覧コードを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              配車閲覧コード
            </label>
            <input
              {...register("pin", {
                required: "配車コードを入力してください",
                minLength: { value: 4, message: "4桁以上で入力してください" },
              })}
              className="border-2 border-gray-300 rounded-lg px-4 py-3 w-full focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/20 focus:outline-none transition-all"
              type="password"
              autoComplete="off"
              placeholder="••••"
            />
            {errors.pin && (
              <p className="text-sm text-red-600">{errors.pin.message}</p>
            )}
            <p className="text-xs text-gray-500">
              チームメンバー共有のコードを入力してください。
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#0F766E] to-[#0D6B64] hover:from-[#0D6B64] hover:to-[#0B5F57] text-white font-medium rounded-lg py-3 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "確認中..." : "配車表示"}
          </button>
        </form>
      </div>
    </div>
  );
}
