'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { TeamFormValues } from "@/app/_types/team";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { api } from "@/utils/api";
import { notFound, useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { UpdateDeleteButtons } from "../_components/UpdateDeleteButtons";
import { EditInput } from "../_components/EditInput";
import { Building2, Users } from "lucide-react";
import toast from "react-hot-toast";

export default function Page() {
  const  { 
    register, 
    handleSubmit, 
    formState: { isSubmitting, errors }, 
    reset, 
    control 
  } = useForm<TeamFormValues>({
    defaultValues: { teamName: '', teamCode: '', isMiddleSchool: false }
  });
  
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { token } = useSupabaseSession();

  const { data, error, isLoading } = useFetch<TeamDetailResponse>(`/api/admin/teams/${teamId}`);
  const isDeleting = useRef(false);
  const memberCount = data?.team?.memberCount ?? 0;

  // フォームの値を監視
  const teamName = useWatch({ control, name: "teamName" });
  const teamCode = useWatch({ control, name: "teamCode" });
  // 既存内容を表示
  useEffect(() => {
    if (data?.team)
      reset({
        teamName: data.team.teamName,
        teamCode: data.team.teamCode,
        isMiddleSchool: data.team.maxGrade === 3,
    });
  },[data, reset]);

  const onSubmit = async (data: TeamFormValues) => {
    if (!token) return;

    // チーム情報更新
    try {
      await api.put<TeamFormValues>(
        `/api/admin/teams/${teamId}`, 
        data,
        token,
      );

      toast.success('チーム詳細を更新しました。');
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
      isDeleting.current = true;
      await api.delete(`/api/admin/teams/${teamId}`, token);

      toast.success('チームを削除しました。');

      router.replace('/admin/teams');
    } catch (e: unknown) {
      isDeleting.current = false;
      console.error(e);
      alert('削除中にエラーが発生しました。');
    }
  }

  if (isLoading) return <LoadingSpinner />
  if (error) {
    // 削除中の404エラーは無視（チーム一覧に遷移中のため）
    if (isDeleting.current) {
      return <LoadingSpinner />;
    }
    // 404エラーの場合はnotFound()を呼び出す
    if (error.message?.includes('404') || error.status === 404) {
      notFound();
    }
    return <div>エラーが発生しました。</div>
  }

  return (
    <div className="app-page">
      <div className="app-container max-w-xl">
        <div className="mb-6">
          <p className="mb-1 text-sm font-semibold text-teal-700">チーム情報</p>
          <h1 className="app-section-title">チーム詳細</h1>
        </div>
        <div className="app-card p-6 md:p-8">
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <EditInput
            icon={<Users size={18} />}
            label="チーム名"
            disabled={isSubmitting}
            hasValue={!!teamName && teamName.length > 0}
            error={errors.teamName?.message}
            errorClassName="text-center ml-16"
            {...register("teamName", { required: "チーム名を入力してください。" })}
          />

          <EditInput
            icon={<Building2 size={18} />}
            label="チームID"
            disabled={isSubmitting}
            hasValue={!!teamCode && teamCode.length > 0}
            error={errors.teamCode?.message}
            errorClassName="text-center ml-16"
            {...register("teamCode", { required: "チームIDを入力してください。" })}
          />

          <label className="group flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/60">
              <input
                type="checkbox"
                {...register("isMiddleSchool")}
                className="h-5 w-5 rounded border-2 border-gray-300 accent-teal-700 transition focus:ring-4 focus:ring-teal-700/15"
              />
              <span className="text-sm font-semibold text-gray-700 transition group-hover:text-teal-900">中学生チーム（3年まで）</span>
          </label>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-gray-500" />
              <h2 className="whitespace-nowrap text-sm font-semibold text-gray-700">メンバー数</h2>
              <div className="w-full flex justify-center">
              <span className="text-lg font-bold text-teal-700">{memberCount}人</span>
              </div>
            </div>
          </div>

          <UpdateDeleteButtons
            onUpdate={handleSubmit(onSubmit)}
            onDelete={handleDeleteTeam}
            isSubmitting={isSubmitting}
          />
        </form>
        </div>
      </div>
    </div>
  );
}
