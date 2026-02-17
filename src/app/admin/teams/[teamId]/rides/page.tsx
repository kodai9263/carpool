'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { Ride } from "@/app/_types/ride";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";
import { Breadcrumb } from "../../../_components/Breadcrumb";
import { Calendar } from "lucide-react";
import PaginationNav from "@/app/_components/PaginationNav";
import { formatDate } from "@/utils/formatDate";

export default function Page() {
  const [page, setPage] = useState(1);
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();

  const url = useMemo(() => {
    return `/api/admin/teams/${teamId}/rides?page=${page}`;
  }, [teamId, page]);

  const { data, error, isLoading } = useFetch(url);
  const { data: teamData } = useFetch<TeamDetailResponse>(`/api/admin/teams/${teamId}`);

  if (!data) return
  const rides = (data.rides || []) as Ride[];
  const totalPages = data.totalPages || 1;
  const delta = data.delta;

  if (!teamId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <Breadcrumb
          items={[
            { label: 'チーム一覧', href: '/admin/teams' },
            { label: teamData?.team.teamName || '', href: `/admin/teams/${teamId}` },
            { label: '配車一覧' },
          ]}
        />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">🚗 配車一覧</h1>
          <NewButton 
            href={`/admin/teams/${teamId}/rides/new`}
          />
        </div>

        <div className="space-y-4">
          {rides.map((ride: Ride) => {
            return(
              <div 
                key={ride.id}
                onClick={() => router.push(`/admin/teams/${teamId}/rides/${ride.id}`)}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-[#5d9b94] shrink-0" />
                  <span className="text-lg font-medium whitespace-nowrap">
                    {formatDate(ride.date)}
                  </span>
                  {ride.isAssignmentComplete ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium whitespace-nowrap">
                      完了
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium whitespace-nowrap">
                      未完了
                    </span>
                  )}
                  {ride.destination && (
                    <span className="text-sm text-gray-500 ml-auto truncate">{ride.destination}</span>
                  )}
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