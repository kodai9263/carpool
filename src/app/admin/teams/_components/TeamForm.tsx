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
    defaultValues: { teamName: "", teamCode: "" },
  });

  const { token } = useSupabaseSession();
  const router = useRouter();

  const onSubmit = async (data: TeamFormValues) => {
    if (!token) return;
    if (data.pin !== data.pinConfirm) {
      alert("配車閲覧用パスコードが一致しません。");
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
      }
      alert("作成中にエラーが発生しました。");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 flex flex-col items-center max-w-xl mx-auto"
    >
      <FormInput
        label="チームID"
        icon={<Building2 size={18} />}
        disabled={isSubmitting}
        error={errors.teamCode?.message}
        {...register("teamCode", { required: "チームIDを入力してください。" })}
        className="w-[300px]"
      />

      <FormInput
        label="チーム名"
        icon={<Users size={18} />}
        disabled={isSubmitting}
        error={errors.teamName?.message}
        {...register("teamName", { required: "チーム名を入力してください。" })}
        className="w-[300px]"
      />

      <FormInput
        label="配車閲覧用パスコード"
        icon={<Key size={18} />}
        disabled={isSubmitting}
        error={errors.pin?.message}
        {...register("pin", {
          required: "パスコードを入力してください。",
          minLength: { value: 4, message: "4文字以上で入力してください。" },
          maxLength: { value: 12, message: "12文字以上で入力してください。" },
        })}
        className="w-[300px]"
      />

      <FormInput
        label="配車閲覧用パスコード(確認用)"
        icon={<KeyRound size={18} />}
        disabled={isSubmitting}
        error={errors.pinConfirm?.message}
        {...register("pinConfirm", {
          required: "確認用のパスコードを入力してください。",
          minLength: { value: 4, message: "4文字以上で入力してください。" },
          maxLength: { value: 12, message: "12文字以上で入力してください。" },
        })}
        className="w-[300px]"
      />

      <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
        <p className="text-xs text-gray-600">
          💡 配車閲覧時に必要なコードです。メンバーに共有してください。
        </p>
      </div>

      <FormButton
        label="登録"
        loadingLabel="登録中..."
        isSubmitting={isSubmitting}
      />
    </form>
  );
}
