'use client';

import { useFetch } from "@/app/_hooks/useFetch";
import { Team } from "@/app/_types/team";
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
  const { data, error, isLoading } = useFetch(url);

  if (!data) return;
  const teams = (data.teams || []) as Team[];
  const totalPages = data.totalPages || 1;
  const delta = data.delta;

  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-10">
      <div className="w-[500px] p-8 rounded-xl shadow-lg bg-white">
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
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Users size={24} className="text-[#5d9b94]" />
                  <span className="text-lg font-medium">
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
            delta={delta}
          />
        )}
        </div>
      </div>
    </div>
  );
}