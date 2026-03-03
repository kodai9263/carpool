"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { AttendanceView } from "@/app/_components/AttendanceView";
import { FormButton } from "@/app/_components/FormButton";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useMemberRideAuth } from "@/app/member/_hooks/useMemberRideAuth";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";
import { notFound, useParams, useRouter } from "next/navigation";
import useSWR from "swr";

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

  return (
    <div className="min-h-screen flex flex-col items-center py-4 md:py-10 px-4">
      <div className="w-full max-w-[800px] bg-white rounded-xl shadow-lg p-4 md:p-8 min-w-0 overflow-hidden">
        <h1 className="text-2xl md:text-3xl font-bold text-center mb-6 md:mb-8">
          参加者・欠席者一覧
        </h1>

        <AttendanceView ride={data.ride} />

        <div className="mt-8 flex justify-center">
          <FormButton
            label="配車詳細に戻る"
            type="button"
            onClick={() =>
              router.push(`/member/teams/${teamId}/rides/${rideId}`)
            }
            className="!w-full !max-w-[300px] py-3 text-base"
          />
        </div>
      </div>
    </div>
  );
}
