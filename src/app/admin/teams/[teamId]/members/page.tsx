'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import PaginationNav from "@/app/_components/PaginationNav";
import { useFetch } from "@/app/_hooks/useFetch";
import { Member } from "@/app/_types/member";
import { ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";

export default function Page() {
  const [page, setPage] = useState(1);
  const { teamId } = useParams<{ teamId: string }>();
  
  const url = useMemo(() => {
    return `/api/admin/teams/${teamId}/members?page=${page}`;
  }, [teamId, page]);

  const { data, error, isLoading } = useFetch(url);

  const members = (data?.members || []) as Member[];
  const totalPages = data?.totalPages || 1;

  if (!teamId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-10">
      <div className="w-[380px] p-6 rounded-md shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">メンバー一覧</h1>
          <NewButton 
            href={`/admin/teams/${teamId}/members/new`}
          />
        </div>
    
        <div className="space-y-3">
          {members.map((member: Member) => {
            return (
              <div key={member.id} className="flex justify-between items-center border-t border-[#5d9b94] pt-3">
                <div className="flex w-full items-center gap-2">
                  <User size={28} className="text-2xl" />
                  <Link 
                    href={`/admin/teams/${teamId}/members/${member.id}`} 
                    className="flex-1 text-center text-lg font-medium"
                  >
                    {member.name}
                  </Link>
                </div>
                <Link 
                  href={`/admin/teams/${teamId}/members/${member.id}`} 
                  className="flex items-center gap-1 text-[#2f6f68] font-medium hover:underline"
                >
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