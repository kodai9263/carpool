"use client";

import { useParams, useRouter } from "next/navigation";
import { AlertCircle, KeyRound, LockKeyhole } from "lucide-react";
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
    setError,
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
        reset();
        setError("pin", {
          type: "manual",
          message: "配車コードが正しくありません。",
        });
        return;
      }

      sessionStorage.setItem(`pin:${teamId}`, p);
      
      // 保存されたリダイレクト先があればそこに、なければ配車一覧へ
      const returnTo = sessionStorage.getItem(`returnTo:${teamId}`);
      if (returnTo) {
        sessionStorage.removeItem(`returnTo:${teamId}`);
        router.push(returnTo);
      } else {
        router.push(`/member/teams/${teamId}/rides`);
      }
    } catch {
      setError("root", {
        type: "manual",
        message: "通信エラーが発生しました。時間をおいて再度お試しください。",
      });
    }
  };

  return (
    <div className="app-page flex min-h-screen items-center justify-center px-4">
      <div className="app-card relative w-full max-w-md overflow-hidden p-6 md:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-700 via-emerald-500 to-amber-300" />
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
            <KeyRound size={30} />
          </div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-gray-950">
            配車閲覧
          </h1>
          <p className="text-sm text-gray-500">
            配車閲覧コードを入力してください
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root?.message && (
            <div className="flex gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <p>{errors.root.message}</p>
            </div>
          )}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <LockKeyhole size={17} className="text-gray-500" />
              配車閲覧コード
            </label>
            <input
              {...register("pin", {
                required: "配車コードを入力してください",
                minLength: { value: 4, message: "4桁以上で入力してください" },
              })}
              className={`app-input ${errors.pin ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`}
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
            className="app-button-primary w-full"
          >
            {isSubmitting ? "確認中..." : "配車表示"}
          </button>
        </form>
      </div>
    </div>
  );
}
