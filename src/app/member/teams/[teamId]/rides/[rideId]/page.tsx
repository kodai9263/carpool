"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { notFound, useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import RideBasicInfo from "./_components/RideBasicInfo";
import RideDriverGrid from "./_components/RideDriverGrid";
import { useMemberRideAuth } from "@/app/member/_hooks/useMemberRideAuth";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";
import { AttendanceListButton } from "@/app/_components/AttendanceListButton";
import { ArrowRight, Bike } from "lucide-react";

export default function Page() {
  const { teamId, rideId } = useParams<{ teamId: string; rideId: string }>();
  const router = useRouter();

  const { pin, url } = useMemberRideAuth(teamId, rideId);
  const fetcher = usePinFetcher();

  const { data, error, isLoading } = useSWR<RideDetailResponse>(
    pin ? url : null,
    fetcher
  );

  if (!teamId || !rideId) return <LoadingSpinner />;
  if (!pin) return <LoadingSpinner />;
  if (isLoading) return <LoadingSpinner />;
  if (error) {
    if (error.message?.includes("404") || error.status === 404) {
      notFound();
    }
  }
  if (!data) return <div>データの取得に失敗しました。</div>;
  if (!data.ride) return <div>配車が見つかりません。</div>;

  const ride = data.ride;

  return (
    <div className="app-page">
      <div className="app-container max-w-3xl">
      <div className="app-card min-w-0 overflow-hidden p-4 md:p-8">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-semibold text-teal-700">配車情報</p>
            <h1 className="app-section-title">配車詳細</h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              配車結果と当日の参加状況を確認できます。
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                `/member/teams/${teamId}/rides/${rideId}/availability`
              )
            }
            className="app-button-primary shrink-0 whitespace-nowrap"
          >
            配車可否入力へ
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="space-y-6 md:space-y-8 min-w-0">
          <div className="min-w-0 overflow-hidden">
            <RideBasicInfo date={ride.date} destination={ride.destination} />
          </div>

          <div className="flex justify-center">
            <AttendanceListButton
              href={`/member/teams/${teamId}/rides/${rideId}/attendance`}
            />
          </div>

          <div className="min-w-0 overflow-hidden">
            <RideDriverGrid drivers={ride.drivers} separateDirections={ride.separateDirections ?? false} />
          </div>

          {/* 自走参加者セクション */}
          {(() => {
            const selfDrivingChildren = (ride.childAvailabilities ?? [])
              .filter((ca) => ca.selfDriving)
              .map((ca) => (ride.children ?? []).find((c) => c.id === ca.childId))
              .filter((c): c is NonNullable<typeof c> => c !== undefined);
            if (selfDrivingChildren.length === 0) return null;
            return (
              <div className="min-w-0 rounded-xl border border-blue-100 bg-blue-50/80 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-blue-900">
                  <Bike size={18} />
                  自走参加者
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selfDrivingChildren.map((child) => (
                    <span
                      key={child.id}
                      className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-sm font-medium text-blue-900 shadow-sm"
                    >
                      {child.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      </div>
    </div>
  );
}
