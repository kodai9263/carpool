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
  const isMiddleSchool = useWatch({ control, name: "isMiddleSchool" });

  // 既存内容を表示
  useEffect(() => {
    if (data?.team)
      reset({
        teamName: data.team.teamName,
        teamCode: data.team.teamCode,
        isMiddleSchool: data.team.maxGrade === 3,
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
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <h1 className="text-3xl font-bold mb-8 text-center">👥 チーム詳細</h1>
        
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

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                {...register("isMiddleSchool")}
                className="w-4 h-4 accent-[#5d9b94]"
              />
              <span className="text-sm font-medium text-gray-700">中学生チーム（学年を3年までに制限）</span>
            </label>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-gray-500" />
              <h2 className="text-lg font-bold whitespace-nowrap">メンバー数</h2>
              <div className="w-full flex justify-center">
              <span className="text-lg font-bold text-[#5d9b94]">{memberCount}人</span>
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
  );
}