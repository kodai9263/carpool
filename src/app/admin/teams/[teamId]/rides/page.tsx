'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import GuidedTour, { type GuidedTourStep } from "@/app/_components/GuidedTour";
import { useFetch } from "@/app/_hooks/useFetch";
import { Ride } from "@/app/_types/ride";
import { TeamDetailResponse } from "@/app/_types/response/teamResponse";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";
import { Calendar, CalendarPlus, ChevronRight, Copy, MapPin, MapPinned } from "lucide-react";
import PaginationNav from "@/app/_components/PaginationNav";
import { formatDate } from "@/utils/formatDate";
import { trackEvent } from "@/utils/analytics";

const rideListGuideSteps = [
  {
    target: "admin-ride-new",
    title: "配車予定を作成します",
    body: "日付、行き先、集合場所を登録すると、メンバーへの回答依頼を作れるようになります。",
  },
  {
    target: "admin-ride-list",
    title: "配車詳細へ進みます",
    body: "配車予定を開くと、回答依頼のLINE共有、自動割り当て、決定後の案内コピーまで進めます。",
  },
] satisfies GuidedTourStep[];

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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">{teamData?.team.teamName}</p>
            <h1 className="app-section-title">配車一覧</h1>
            <p className="mt-2 text-sm text-gray-500">{rides.length}件の配車予定を表示中</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <GuidedTour
              storageKey="admin-ride-list-guided-tour:v1"
              steps={rideListGuideSteps}
              autoStart
              className="app-button-secondary w-full shrink-0 sm:w-auto"
            />
            <div data-guide="admin-ride-new" className="w-full sm:w-auto">
              <NewButton
                href={`/admin/teams/${teamId}/rides/new`}
                trackLabel="ride_header"
              />
            </div>
          </div>
        </div>

        <div className="app-card divide-y divide-gray-100 overflow-hidden" data-guide="admin-ride-list">
          {rides.length === 0 && (
            <div className="app-empty-state">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <CalendarPlus size={22} />
              </span>
              <p className="font-bold text-gray-950">まだ配車予定がありません</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                試合や練習の日程を作成すると、メンバーへの回答依頼を始められます。
              </p>
              <div className="mt-5">
                <NewButton
                  href={`/admin/teams/${teamId}/rides/new`}
                  trackLabel="ride_empty_state"
                />
              </div>
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
                  {(ride.destination || ride.meetingPlace) && (
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      {ride.destination && (
                        <span className="flex min-w-0 max-w-full items-center gap-1">
                          <MapPin size={14} className="shrink-0" />
                          <span className="min-w-0 truncate">行き先: {ride.destination}</span>
                        </span>
                      )}
                      {ride.meetingPlace && (
                        <span className="flex min-w-0 max-w-full items-center gap-1">
                          <MapPinned size={14} className="shrink-0" />
                          <span className="min-w-0 truncate">集合場所: {ride.meetingPlace}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    trackEvent("ride_duplicate_clicked", {
                      team_id: teamId,
                      ride_id: ride.id,
                    });
                    const params = new URLSearchParams();
                    if (ride.destination) params.set("destination", ride.destination);
                    if (ride.meetingPlace) params.set("meetingPlace", ride.meetingPlace);
                    router.push(`/admin/teams/${teamId}/rides/new?${params.toString()}`);
                  }}
                  className="app-button-secondary shrink-0 px-3 py-1.5 text-xs"
                  title="この配車の行き先・集合場所を引き継いで新規作成"
                >
                  <Copy size={14} />
                  複製
                </button>
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
