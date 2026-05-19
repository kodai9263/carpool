'use client';

import { useFetch } from "@/app/_hooks/useFetch";
import { Team } from "@/app/_types/team";
import { TeamsListResponse } from "@/app/_types/response/teamResponse";
import { CalendarPlus, CheckCircle2, ChevronRight, Sparkles, Users, WalletCards } from "lucide-react";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useMemo, useState } from "react";
import PaginationNav from "@/app/_components/PaginationNav";
import { NewButton } from "./_components/NewButton";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/utils/analytics";
import { FREE_TEAM_LIMIT, isSecondTeamCandidate, PRO_ADDITIONAL_TEAM_PRICE_JPY } from "@/utils/billing";

export default function Page() {
  const [page, setPage] = useState(1);
  const router = useRouter();

  // ページ番号が押されたときだけレンダリングしたいので、useMemoを使用
  const url = useMemo(() => `/api/admin/teams?page=${page}`,[page]);
  const { data, error, isLoading } = useFetch<TeamsListResponse>(url);

  if (!data) return;
  const teams = (data.teams || []) as Team[];
  const totalPages = data.totalPages || 1;
  const totalTeams = data.total || teams.length;

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  // チームが0件の場合はオンボーディング画面を表示
  if (teams.length === 0) {
    const steps = [
      { step: 1, label: "チームを作成", description: "チーム名・PINを決めるだけで始められます" },
      { step: 2, label: "メンバーを登録", description: "最初は数名だけでも大丈夫です" },
      { step: 3, label: "配車日程を作成", description: "URLとPINをLINEに貼って回答を集めます" },
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
            まずは無料の1チームで、次の配車を作ってみましょう
          </p>

          {/* ステップ */}
          <div className="app-card mb-6 space-y-5 p-6">
            {steps.map(({ step, label, description }, index) => (
              <div key={step} className="relative flex items-start gap-4">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-teal-700 text-sm font-bold text-white shadow-sm">
                  {step}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-semibold text-gray-800 text-sm">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-[1.125rem] top-10 h-5 w-px bg-gray-200" />
                )}
              </div>
            ))}
          </div>

          <div className="mb-6 rounded-xl border border-teal-100 bg-teal-50/70 p-4">
            <div className="flex gap-3 text-sm leading-6 text-teal-900">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-teal-700" />
              <p>
                {FREE_TEAM_LIMIT}チームまでは無料で、配車作成・回答収集・自動割り当てを試せます。
              </p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-center">
            <NewButton href="/admin/teams/new" trackLabel="team_empty_onboarding" />
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
            <p className="mt-2 text-sm text-gray-500">{totalTeams}件のチームを管理中</p>
          </div>
          <NewButton
            href="/admin/teams/new"
            trackLabel={isSecondTeamCandidate(totalTeams) ? "team_new_soft_pro_candidate" : "team_new"}
          />
        </div>

        {isSecondTeamCandidate(totalTeams) && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm">
                  <WalletCards size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-amber-900">2チーム目以降はPro対象として準備中です</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    今は作成を止めません。追加チームは月額{PRO_ADDITIONAL_TEAM_PRICE_JPY.toLocaleString("ja-JP")}円から検討中です。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  trackEvent("upgrade_clicked", { source: "team_list_soft_limit" });
                  router.push("/admin/profile#plan");
                }}
                className="app-button-secondary shrink-0 border-amber-200 bg-white text-amber-900 hover:bg-amber-100"
              >
                プランを見る
              </button>
            </div>
          </div>
        )}

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

        <div className="mt-6 rounded-xl border border-gray-100 bg-white/70 p-4">
          <div className="flex gap-3 text-sm leading-6 text-gray-600">
            <CalendarPlus size={18} className="mt-0.5 shrink-0 text-teal-700" />
            <p>
              新しい配車は、チーム詳細から「メンバー登録」後に作ると回答依頼までスムーズです。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
