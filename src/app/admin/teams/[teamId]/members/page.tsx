'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import PaginationNav from "@/app/_components/PaginationNav";
import { useFetch } from "@/app/_hooks/useFetch";
import { Member } from "@/app/_types/member";
import { User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";

export default function Page() {
  const [page, setPage] = useState(1);
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  
  const url = useMemo(() => {
    return `/api/admin/teams/${teamId}/members?page=${page}`;
  }, [teamId, page]);

  const { data, error, isLoading } = useFetch(url);

  const members = (data?.members || []) as Member[];
  const totalPages = data?.totalPages || 1;
  const delta = data?.delta;

  if (!teamId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">👤 メンバー一覧</h1>
          <NewButton 
            href={`/admin/teams/${teamId}/members/new`}
          />
        </div>
    
        <div className="space-y-4">
          {members.map((member: Member) => {
            return (
              <div 
                key={member.id}
                onClick={() => router.push(`/admin/teams/${teamId}/members/${member.id}`)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <User size={24} className="text-[#5d9b94]" />
                  <span className="text-lg font-medium">
                    {member.name}
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