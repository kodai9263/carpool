'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { Ride } from "@/app/_types/ride";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";
import { Calendar, CalendarPlus, ChevronRight, MapPin } from "lucide-react";
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
    <div className="app-page">
      <div className="app-container max-w-3xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">{teamData?.team.teamName}</p>
            <h1 className="app-section-title">配車一覧</h1>
            <p className="mt-2 text-sm text-gray-500">{rides.length}件の配車予定を表示中</p>
          </div>
          <NewButton 
            href={`/admin/teams/${teamId}/rides/new`}
          />
        </div>

        <div className="app-card divide-y divide-gray-100 overflow-hidden">
          {rides.length === 0 && (
            <div className="app-empty-state">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <CalendarPlus size={22} />
              </span>
              <p className="font-bold text-gray-950">まだ配車予定がありません</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                試合や練習の日程を作成すると、メンバーへの回答依頼を始められます。
              </p>
            </div>
          )}
          {rides.map((ride: Ride) => {
            return(
              <div 
                key={ride.id}
                onClick={() => router.push(`/admin/teams/${teamId}/rides/${ride.id}`)}
                className="app-list-row group"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition group-hover:bg-teal-100">
                  <Calendar size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-gray-950">
                    {formatDate(ride.date)}
                  </span>
                  {ride.isAssignmentComplete ? (
                    <span className="app-status bg-green-100 text-green-700">
                      完了
                    </span>
                  ) : (
                    <span className="app-status bg-gray-100 text-gray-500">
                      未完了
                    </span>
                  )}
                  </div>
                  {ride.destination && (
                    <span className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
                      <MapPin size={14} />
                      {ride.destination}
                    </span>
                  )}
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
              delta={delta}
            />
          )}
        </div>
      </div>
    </div>
  );
}
