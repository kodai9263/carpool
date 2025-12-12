'use client';

import { FormButton } from "@/app/_components/Formbutton";
import { FormInput } from "@/app/_components/FormInput";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { TeamFormValues } from "@/app/_types/team";
import { api } from "@/utils/api";
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form";

export default function TeamForm() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<TeamFormValues>({
    defaultValues: { teamName: '', teamCode: '' }
  });

  const { token } = useSupabaseSession();
  const router = useRouter();

  const onSubmit = async (data: TeamFormValues) => {
    if (!token) return;
    if (data.pin !== data.pinConfirm) {
      alert('配車閲覧用パスコードが一致しません。')
      return;
    }

    try {
      const { id } = await api.post<TeamFormValues>(
        '/api/admin/teams',
        data,
        token,
      );

      router.push(`/admin/teams/${id}/rides`);
      alert('チームを作成しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('作成中にエラーが発生しました。');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormInput
        label="チームID"
        disabled={isSubmitting}
        {...register("teamCode", { required: "チームIDを入力してください。" })}
      />

      <FormInput
        label="チーム名"
        disabled={isSubmitting}
        {...register("teamName", { required: "チーム名を入力してください。" })}
      />

      <FormInput
        label="配車閲覧用パスコード"
        disabled={isSubmitting}
        {...register("pin", { 
          required: "パスコードを入力してください。", 
          minLength: { value: 4, message: "4文字以上で入力してください。" },
          maxLength: { value: 12, message: "12文字以上で入力してください。" },
        })}
      />
      <p className="text-center text-xs text-gray-500 mt-1 mb-3">
        配車閲覧時に必要なコードです。メンバーに共有してください。
      </p>

      <FormInput
        label="配車閲覧用パスコード(確認用)"
        disabled={isSubmitting}
        {...register("pinConfirm", {
          required: "確認用のパスコードを入力してください。",
          minLength: { value: 4, message: "4文字以上で入力してください。" },
          maxLength: { value: 12, message: "12文字以上で入力してください。" },
        })}
      />

      <FormButton 
        label="登録"
        loadingLabel="登録中..."
        isSubmitting={isSubmitting}
      />
    </form>
  );
}