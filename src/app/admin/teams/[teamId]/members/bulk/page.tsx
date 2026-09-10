"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import toast from "react-hot-toast";
import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { api } from "@/utils/api";
import BulkMemberForm from "../_components/BulkMemberForm";

export default function Page() {
  const { teamId } = useParams<{ teamId: string }>();
  const { token } = useSupabaseSession();
  const { data, error } = useFetch<TeamDetailResponse>(`/api/admin/teams/${teamId}`);
  const router = useRouter();
  const { mutate } = useSWRConfig();
  if (error) return <div className="app-page"><p role="alert">チームを読み込めませんでした。再読み込みしてください。</p></div>;
  if (!data || !token) return <LoadingSpinner />;

  return (
    <div className="app-page"><div className="app-container max-w-3xl">
      <div className="mb-6"><p className="text-sm text-gray-600">{data.team.teamName}</p><h1 className="app-section-title mt-1">家族をまとめて登録</h1></div>
      <div className="app-card p-4 md:p-6">
        <BulkMemberForm maxGrade={data.team.maxGrade} onSave={async (families) => {
          await api.post(`/api/admin/teams/${teamId}/members/bulk`, { families }, token);
          // 登録成功後の表示更新失敗を、登録失敗として再送させない。
          void mutate((key) => typeof key === "string" && (key === `/api/admin/teams/${teamId}` || key.startsWith(`/api/admin/teams/${teamId}/members`) || key === `/api/admin/teams/${teamId}/getting-started`)).catch(() => undefined);
          toast.success(`${families.length}家族を登録しました`);
          router.push(`/admin/teams/${teamId}/members`);
        }} />
        <Link href={`/admin/teams/${teamId}/members`} className="mt-6 inline-block text-sm text-teal-800 underline">家族一覧へ戻る</Link>
      </div>
    </div></div>
  );
}
