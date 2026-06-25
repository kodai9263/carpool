"use client";

import { FormButton } from "@/app/_components/FormButton";
import { FormInput } from "@/app/_components/FormInput";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { TeamFormValues } from "@/app/_types/team";
import { api } from "@/utils/api";
import { Building2, Key, KeyRound, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";

export default function TeamForm() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
    setError,
  } = useForm<TeamFormValues>({
    defaultValues: { teamName: "", teamCode: "", isMiddleSchool: false },
  });

  const { token } = useSupabaseSession();
  const router = useRouter();

  const onSubmit = async (data: TeamFormValues) => {
    if (!token) return;
    if (data.pin !== data.pinConfirm) {
      setError("pinConfirm", {
        type: "manual",
        message: "配車閲覧用パスコードが一致しません。",
      });
      return;
    }

    try {
      const { id } = await api.post<TeamFormValues>(
        "/api/admin/teams",
        data,
        token
      );

      router.push(`/admin/teams/${id}/rides`);
      toast.success("チームを作成しました。");
    } catch (e: unknown) {
      console.error(e);

      if (e && typeof e === "object" && "status" in e) {
        const error = e as { status: number; message: string };

        if (error.status === 409) {
          setError("teamCode", {
            type: "manual",
            message: "このチームIDは既に使用されています。",
          });
          return;
        }
        if (error.status === 402) {
          toast.error(error.message);
          router.push("/admin/profile#plan");
          return;
        }
      }
      alert("作成中にエラーが発生しました。");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="mx-auto flex max-w-xl flex-col space-y-6"
    >
      <FormInput
        label="チームID"
        icon={<Building2 size={18} />}
        disabled={isSubmitting}
        error={errors.teamCode?.message}
        helperText="URLや管理画面で使う短い識別子です。"
        {...register("teamCode", { required: "チームIDを入力してください。" })}
        className="w-full"
      />

      <FormInput
        label="チーム名"
        icon={<Users size={18} />}
        disabled={isSubmitting}
        error={errors.teamName?.message}
        helperText="保護者にも表示されるチーム名です。"
        {...register("teamName", { required: "チーム名を入力してください。" })}
        className="w-full"
      />

      <FormInput
        label="配車閲覧用パスコード"
        icon={<Key size={18} />}
        disabled={isSubmitting}
        error={errors.pin?.message}
        {...register("pin", {
          required: "パスコードを入力してください。",
          minLength: { value: 4, message: "4文字以上で入力してください。" },
          maxLength: { value: 12, message: "12文字以下で入力してください。" },
        })}
        className="w-full"
      />

      <FormInput
        label="配車閲覧用パスコード(確認用)"
        icon={<KeyRound size={18} />}
        disabled={isSubmitting}
        error={errors.pinConfirm?.message}
        {...register("pinConfirm", {
          required: "確認用のパスコードを入力してください。",
          minLength: { value: 4, message: "4文字以上で入力してください。" },
          maxLength: { value: 12, message: "12文字以下で入力してください。" },
        })}
        className="w-full"
      />

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs leading-5 text-amber-800">
          配車閲覧時に必要なコードです。メンバーに共有してください。
        </p>
      </div>

      <div>
        <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/60">
          <input
            type="checkbox"
            {...register("isMiddleSchool")}
            className="h-5 w-5 rounded border-2 border-gray-300 accent-teal-700 transition focus:ring-4 focus:ring-teal-700/15"
          />
          <span className="text-sm font-semibold text-gray-700 transition group-hover:text-teal-900">中学生チーム（3年まで）</span>
        </label>
      </div>

      <FormButton label="登録" loadingLabel="登録中..." isSubmitting={isSubmitting} />
    </form>
  );
}
