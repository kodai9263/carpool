"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { Calendar, CalendarClock, ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";
import PaginationNav from "@/app/_components/PaginationNav";
import { formatDate } from "@/utils/formatDate";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";
import useSWR from "swr";
import { RideListResponse } from "@/app/_types/response/rideResponse";
import { useMemberTeamAuth } from "@/app/member/_hooks/useMemberTeamAuth";

export default function Page() {
  const [page, setPage] = useState(1);
  const { teamId } = useParams<{ teamId: string }>();

  const pin = useMemberTeamAuth(teamId);
  const fetcher = usePinFetcher();

  const { data, error, isLoading } = useSWR<RideListResponse>(
    pin ? `/api/member/teams/${teamId}/rides?page=${page}` : null,
    fetcher
  );

  if (!teamId) return <LoadingSpinner />;
  if (!pin) return<LoadingSpinner />;
  if (isLoading) return <LoadingSpinner />;
  if (error) {
    if (error.message?.includes("404") || error.status === 404) {
      notFound();
    }
  }

  if (!data) return <div>データの取得に失敗しました。</div>;
  if (!data.rides) <div>配車が見つかりません。</div>;

  const rides = data.rides;
  const totalPages = data.totalPages || 1;

  return (
    <div className="app-page">
      <div className="app-container max-w-3xl">
        <div className="mb-6 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,118,110,0.08)] ring-1 ring-gray-950/[0.02] backdrop-blur md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <CalendarClock size={24} />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-teal-700">メンバーダッシュボード</p>
              <h1 className="app-section-title">配車一覧</h1>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                参加予定の配車と、確定した乗車先を確認できます。
              </p>
            </div>
          </div>
        </div>

        <div className="app-card divide-y divide-gray-100 overflow-hidden">
          {rides?.length === 0 && (
            <div className="app-empty-state">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <Calendar size={22} />
              </span>
              <p className="font-bold text-gray-950">配車予定はまだありません</p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                新しい配車が作成されると、ここに表示されます。
              </p>
            </div>
          )}
          {rides?.map((ride) => {
            return (
              <Link
                key={ride.id}
                href={`/member/teams/${teamId}/rides/${ride.id}`}
                className="app-list-row group"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition group-hover:bg-teal-100">
                  <Calendar size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-gray-950">
                    {formatDate(ride.date)}
                  </span>
                  {ride.destination && (
                    <span className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
                      <MapPin size={14} />
                      {ride.destination}
                    </span>
                  )}
                </div>
                <ChevronRight size={18} className="text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </Link>
            );
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
