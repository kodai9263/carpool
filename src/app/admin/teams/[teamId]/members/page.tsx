'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import GuidedTour, { type GuidedTourStep } from "@/app/_components/GuidedTour";
import PaginationNav from "@/app/_components/PaginationNav";
import { useFetch } from "@/app/_hooks/useFetch";
import { Member } from "@/app/_types/member";
import { MemberListResponse } from "@/app/_types/response/memberResponse";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { ChevronRight, Search, User, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";

const memberListGuideSteps = [
  {
    target: "admin-member-new",
    title: "保護者と子どもを登録します",
    body: "配車回答を集める前に、家族ごとの保護者名とお子さんを登録します。送迎・引率を別々の保護者が担当する場合は、同じ家庭でも父・母などを分けて登録しておくと選びやすくなります。",
  },
  {
    target: "admin-member-list",
    title: "登録内容を確認します",
    body: "登録した家族はここに並びます。名前を押すと、保護者や子どもの情報をあとから編集できます。",
  },
] satisfies GuidedTourStep[];

export default function Page() {
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [search, setSearch] = useState("");
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  // Enterキーで検索実行
  const handleSearch = () => {
    setSearch(inputValue);
    setPage(1);
  };

  const url = useMemo(() => {
    return `/api/admin/teams/${teamId}/members?page=${page}&search=${encodeURIComponent(search)}`;
  }, [teamId, page, search]);

  const { data, error, isLoading } = useFetch<MemberListResponse>(url);
  const { data: teamData } = useFetch<TeamDetailResponse>(`/api/admin/teams/${teamId}`);

  const members = (data?.members || []) as Member[];
  const totalPages = data?.totalPages || 1;

  if (!teamId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="app-page">
      <div className="app-container max-w-3xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">{teamData?.team.teamName}</p>
            <h1 className="app-section-title">メンバー一覧</h1>
            <p className="mt-2 text-sm text-gray-500">{members.length}件の家族を表示中</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <GuidedTour
              storageKey="admin-member-list-guided-tour:v1"
              steps={memberListGuideSteps}
              autoStart
              className="app-button-secondary w-full shrink-0 sm:w-auto"
            />
            <div data-guide="admin-member-new" className="w-full sm:w-auto">
              <NewButton
                href={`/admin/teams/${teamId}/members/new`}
                trackLabel="member_header"
              />
            </div>
          </div>
        </div>

        {/* 検索フォーム */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="名前で検索（保護者・お子さん）..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="app-input pl-9"
          />
        </div>

        <div className="app-card divide-y divide-gray-100 overflow-hidden" data-guide="admin-member-list">
          {members.length === 0 && (
            <div className="app-empty-state">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <UserPlus size={22} />
              </span>
              <p className="font-bold text-gray-950">
                {search ? "該当するメンバーが見つかりません" : "まだメンバーがいません"}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {search ? `「${search}」の検索条件を変えてみてください。` : "保護者と子どもを登録すると、配車の回答依頼を始められます。"}
              </p>
              {!search && (
                <div className="mt-5">
                  <NewButton
                    href={`/admin/teams/${teamId}/members/new`}
                    trackLabel="member_empty_state"
                  />
                </div>
              )}
            </div>
          )}
          {members.map((member: Member) => {
            return (
              <div
                key={member.id}
                onClick={() => router.push(`/admin/teams/${teamId}/members/${member.id}`)}
                className="app-list-row group"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition group-hover:bg-teal-100">
                  <User size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold text-gray-950" title={member.guardians.map(g => g.name).join('・')}>
                    {member.guardians.length > 0 ? `${member.guardians[0].name} 家族` : ''}
                  </span>
                  <span className="block truncate text-sm text-gray-500">
                    {member.children?.map((child) => child.name).join("、") || "子ども未登録"}
                  </span>
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
