'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import PaginationNav from "@/app/_components/PaginationNav";
import { useFetch } from "@/app/_hooks/useFetch";
import { Member } from "@/app/_types/member";
import { MemberListResponse } from "@/app/_types/response/memberResponse";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { Search, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";

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
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">👤 メンバー一覧</h1>
          <NewButton
            href={`/admin/teams/${teamId}/members/new`}
          />
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
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#5d9b94]"
          />
        </div>

        <div className="space-y-4">
          {members.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              {search ? `「${search}」に一致するメンバーが見つかりません` : 'メンバーがいません'}
            </p>
          )}
          {members.map((member: Member) => {
            return (
              <div
                key={member.id}
                onClick={() => router.push(`/admin/teams/${teamId}/members/${member.id}`)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200 cursor-pointer w-full"
              >
                <div className="grid grid-cols-[24px_1fr] gap-3 items-center">
                  <User size={24} className="text-[#5d9b94]" />
                  <span
                    className="text-lg font-medium truncate"
                    title={member.guardians.map(g => g.name).join('・')}
                  >
                    {member.guardians.length > 0
                      ? `${member.guardians[0].name} 家族`
                      : ''}
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