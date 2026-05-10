'use client';

import { useFetch } from "@/app/_hooks/useFetch";
import { Team } from "@/app/_types/team";
import { TeamsListResponse } from "@/app/_types/response/teamResponse";
import { ChevronRight, Sparkles, Users } from "lucide-react";
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
      <div className="app-page flex items-center justify-center">
        <div className="w-full max-w-[460px]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 shadow-sm">
            <Sparkles size={24} />
          </div>
          {/* タイトル */}
          <h1 className="mb-2 text-center text-3xl font-bold tracking-tight text-gray-950">
            はじめましょう
          </h1>
          <p className="mb-10 text-center text-sm text-gray-500">
            まずはチームを作成してください
          </p>

          {/* ステップ */}
          <div className="app-card mb-6 space-y-5 p-6">
            {steps.map(({ step, label, description }, index) => (
              <div key={step} className="flex items-start gap-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white shadow-sm">
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
    <div className="app-page">
      <div className="app-container max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">チーム管理</p>
            <h1 className="app-section-title">チーム一覧</h1>
            <p className="mt-2 text-sm text-gray-500">{teams.length}件のチームを管理中</p>
          </div>
          <NewButton
            href="/admin/teams/new"
          />
        </div>

        <div className="app-card divide-y divide-gray-100 overflow-hidden">
          {teams.map((team: Team) => {
            return (
              <div
                key={team.id}
                onClick={() => router.push(`/admin/teams/${team.id}`)}
                className="app-list-row group"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition group-hover:bg-teal-100">
                  <Users size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-gray-950" title={team.teamName}>
                    {team.teamName}
                  </span>
                  <span className="text-sm text-gray-500">チーム詳細へ</span>
                </div>
                <ChevronRight size={18} className="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </div>
            )
          })}
        </div>

        <div className="mt-8">
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
