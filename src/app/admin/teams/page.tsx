'use client';

import { useFetch } from "@/app/_hooks/useFetch";
import { Team } from "@/app/_types/team";
import { TeamsListResponse } from "@/app/_types/response/teamResponse";
import { Users } from "lucide-react";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useMemo, useState } from "react";
import PaginationNav from "@/app/_components/PaginationNav";
import { NewButton } from "./_components/NewButton";
import { useRouter } from "next/navigation";

export default function Page() {
  const [page, setPage] = useState(1);
  const router = useRouter();

  // ページ番号が押されたときだけレンダリングしたいので、useMemoを使用
  const url = useMemo(() => `/api/admin/teams?page=${page}`,[page]);
  const { data, error, isLoading } = useFetch<TeamsListResponse>(url);

  if (!data) return;
  const teams = (data.teams || []) as Team[];
  const totalPages = data.totalPages || 1;

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  // チームが0件の場合はオンボーディング画面を表示
  if (teams.length === 0) {
    const steps = [
      { step: 1, label: "チームを作成する", description: "チーム名を登録してスタート" },
      { step: 2, label: "メンバーを登録する", description: "保護者の名前と子どもを登録" },
      { step: 3, label: "PINをLINEで共有する", description: "メンバーがPINでログインできます" },
      { step: 4, label: "配車日程を作成する", description: "日程を作成して可否を募集" },
    ];

    return (
      <div className="min-h-screen flex justify-center items-center px-4 bg-gradient-to-br from-[#eaf4f3] to-[#f5fafa]">
        <div className="w-full max-w-[460px]">
          {/* タイトル */}
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2 tracking-tight">
            はじめましょう
          </h1>
          <p className="text-sm text-gray-400 text-center mb-10">
            まずはチームを作成してください
          </p>

          {/* ステップ */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6 space-y-5">
            {steps.map(({ step, label, description }, index) => (
              <div key={step} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-[#5d9b94] to-[#3d7970] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {step}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-semibold text-gray-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-[2.125rem] mt-9 w-px h-5 bg-gray-200" />
                )}
              </div>
            ))}
          </div>

          {/* ボタン */}
          <div className="flex justify-center">
            <NewButton href="/admin/teams/new" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">👥 チーム一覧</h1>
          <NewButton
            href="/admin/teams/new"
          />
        </div>

        <div className="space-y-4">
          {teams.map((team: Team) => {
            return (
              <div
                key={team.id}
                onClick={() => router.push(`/admin/teams/${team.id}`)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200 cursor-pointer w-full"
              >
                <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
                  <Users size={24} className="text-[#5d9b94]" />
                  <span className="text-lg font-medium truncate" title={team.teamName}>
                    {team.teamName}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-10">
          {totalPages > 1 && (
          <PaginationNav
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
        </div>
      </div>
    </div>
  );
}