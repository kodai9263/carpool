'use client';

import { useFetch } from "@/app/_hooks/useFetch";
import { Team } from "@/app/_types/Team";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useMemo, useState } from "react";
import PaginationNav from "@/app/_components/PaginationNav";

export default function Page() {
  const [page, setPage] = useState(1);
  const perPage = 5;

  // ページ番号が押されたときだけレンダリングしたいので、useMemoを使用
  const url = useMemo(() => `/api/admin/teams?page=${page}&perPage=${perPage}`, [page, perPage]);
  const { data, error, isLoading } = useFetch(url);

  const teams = (data?.teams || []) as Team[];
  const totalPages = data?.totalPages || 1;

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-10">
      <div className="w-[380px] p-6 rounded-md shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">チーム一覧</h1>
          <Link 
            href="/admin/teams/new"
            className="bg-[#2f6f68] text-white px-4 py-2 rounded-lg hover:bg-[#2a5f5a]"
          >
            ＋ 新規作成
          </Link>
        </div>

        <div className="space-y-3">
          {teams.map((team: Team) => {
            return (
              <div key={team.id} className="flex justify-between items-center border-t border-[#5d9b94] pt-3">
                <div className="flex justify-between items-center gap-2">
                  <Users size={28} className="text-2xl mr-8" />
                  <Link 
                    href={`/admin/teams/${team.id}`} 
                    className="text-lg font-medium"
                  >
                    {team.teamName}
                  </Link>
                </div>
                <Link 
                  href={`/admin/teams/${team.id}/rides`}
                  className="flex items-center gap-1 text-[#2f6f68] font-medium hover:underline"
                >
                  配車一覧
                  <ChevronRight size={20} />
                </Link>
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