'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { TeamFormValues } from "@/app/_types/team";
import { api } from "@/utils/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { UpdateDeleteButtons } from "../_components/UpdateDeleteButtons";
import { EditInput } from "../_components/EditInput";

export default function Page() {
  const  { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<TeamFormValues>({
    defaultValues: { teamName: '', teamCode: '' }
  });
  
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { token } = useSupabaseSession();

  const { data, error, isLoading } = useFetch(`/api/admin/teams/${teamId}`);
  const memberCount = data?.team?.memberCount ?? 0;

  // 既存内容を表示
  useEffect(() => {
    if (data?.team)
      reset({
        teamName: data.team.teamName,
        teamCode: data.team.teamCode,
    });
  },[data]);

  const onSubmit = async (data: TeamFormValues) => {
    if (!token) return;

    // チーム情報更新
    try {
      await api.put<TeamFormValues>(
        `/api/admin/teams/${teamId}`, 
        data,
        token,
      );

      alert('チーム詳細を更新しました。');
    } catch (e: unknown) {
      console.error(e);
      alert('更新中にエラーが発生しました。');
    }
  }

  // チーム削除
  const handleDeleteTeam = async () => {
    if (!confirm('チームを削除しますか？')) return;
    if (!token) return;

    try {
      await api.delete(`/api/admin/teams/${teamId}`, token);

      alert('チームを削除しました。');

      router.replace('/admin/teams');
    } catch (e: unknown) {
      console.error(e);
      alert('削除中にエラーが発生しました。');
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8 mt-10">チーム詳細</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-md w-[400px] space-y-8">
          <EditInput
            label="チーム名"
            disabled={isSubmitting}
            {...register("teamName", { required: true })}
          />

          <EditInput
            label="チームID"
            disabled={isSubmitting}
            {...register("teamCode", { required: true })}
          />

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">メンバー数</h2>
            <p className="mt-1 font-bold text-center flex-1">{memberCount}人</p>
          </div>
        </div>

        <UpdateDeleteButtons
          onUpdate={handleSubmit(onSubmit)}
          onDelete={handleDeleteTeam}
          isSubmitting={isSubmitting}
        />
      </form>
    </div>
  );
}