'use client';

import { FormButton } from "@/app/_components/Formbutton";
import { FormInput } from "@/app/_components/FormInput";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { TeamFormValues } from "@/app/_types/Team";
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

    try {
      const { id } = await api.post(
        '/api/admin/teams',
        { teamName: data.teamName, teamCode: data.teamCode },
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
        name="teamCode"
        disabled={isSubmitting}
        register={register}
        rules={{ required: "チームIDを入力してください。" }}
      />

      <FormInput
        label="チーム名"
        name="teamName"
        disabled={isSubmitting}
        register={register}
        rules={{ required: "チーム名を入力してください。" }}
      />

      <FormButton 
        label="登録"
        loadingLabel="登録中..."
        isSubmitting={isSubmitting}
      />
    </form>
  );
}