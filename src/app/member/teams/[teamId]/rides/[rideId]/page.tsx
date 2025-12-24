'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { FormButton } from "@/app/_components/FormButton"; 
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import RideBasicInfo from "./_components/RideBasicInfo";
import RideDriverGrid from "./_components/RideDriverGrid";
import { useMemberRideAuth } from "@/app/member/_hooks/useMemberRideAuth";

export default function Page() {
  const { teamId, rideId } = useParams<{ teamId: string; rideId: string }>();
  const router = useRouter();

  const { url } = useMemberRideAuth(teamId,rideId);

  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const { data, error, isLoading } = useSWR<RideDetailResponse>(url, fetcher);

  if (!data) return;
  const ride = data.ride;

  if (!teamId || !rideId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>
  if (!ride) return <div>配車が見つかりません。</div>

  return (
    <div className="min-h-screen flex flex-col items-center py-10">
      <h1 className="text-3xl font-bold mb-8">配車詳細</h1>

      <div className="w-full max-w-[800px] bg-white rounded-xl shadow-md p-8 space-y-8">
        <RideBasicInfo 
          date={ride.date}
          destination={ride.destination}
        />

        <RideDriverGrid drivers={ride.drivers} />

        <FormButton
          label="配車可否入力へ"
          type="button"
          onClick={() => router.push(`/member/teams/${teamId}/rides/${rideId}/availability`)}
          className="!w-[400px] py-3 text-base"
        />
      </div>
    </div>
  );
}
