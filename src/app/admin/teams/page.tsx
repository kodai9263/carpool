'use client';

import { useFetch } from "@/app/_hooks/useFetch";
import { Team } from "@/app/_types/team";
import Link from "next/link";
import { Users, ChevronRight } from "lucide-react";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useMemo, useState } from "react";
import PaginationNav from "@/app/_components/PaginationNav";
import { NewButton } from "./_components/NewButton";

export default function Page() {
  const [page, setPage] = useState(1);

  // ページ番号が押されたときだけレンダリングしたいので、useMemoを使用
  const url = useMemo(() => `/api/admin/teams?page=${page}`,[page]);
  const { data, error, isLoading } = useFetch(url);

  if (!data) return;
  const teams = (data.teams || []) as Team[];
  const totalPages = data.totalPages || 1;
  const delta = data.delta;

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-10 bg-gray-50">
      <div className="w-[380px] p-6 rounded-md shadow-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">チーム一覧</h1>
          <NewButton 
            href="/admin/teams/new"
          />
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
            delta={delta}
          />
        )}
        </div>
      </div>
    </div>
  );
}