"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { FormButton } from "@/app/_components/FormButton";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { notFound, useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import RideBasicInfo from "./_components/RideBasicInfo";
import RideDriverGrid from "./_components/RideDriverGrid";
import { useMemberRideAuth } from "@/app/member/_hooks/useMemberRideAuth";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";

export default function Page() {
  const { teamId, rideId } = useParams<{ teamId: string; rideId: string }>();
  const router = useRouter();

  const { url } = useMemberRideAuth(teamId, rideId);
  const fetcher = usePinFetcher();

  const { data, error, isLoading } = useSWR<RideDetailResponse>(url, fetcher);

  if (!teamId || !rideId) return <LoadingSpinner />;
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
    <div className="min-h-screen flex flex-col items-center py-4 md:py-10 px-4">
      <div className="w-full max-w-[1000px] bg-white rounded-xl shadow-lg p-4 md:p-8 min-w-0 overflow-hidden">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8 break-words">
          🚗 配車詳細
        </h1>

        <div className="space-y-6 md:space-y-8 min-w-0">
          <div className="min-w-0 overflow-hidden">
            <RideBasicInfo date={ride.date} destination={ride.destination} />
          </div>

          <div className="min-w-0 overflow-hidden">
            <RideDriverGrid drivers={ride.drivers} />
          </div>

          <div className="flex justify-center w-full">
            <FormButton
              label="配車可否入力へ"
              type="button"
              onClick={() =>
                router.push(
                  `/member/teams/${teamId}/rides/${rideId}/availability`
                )
              }
              className="!w-full !max-w-[300px] py-3 text-base"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
