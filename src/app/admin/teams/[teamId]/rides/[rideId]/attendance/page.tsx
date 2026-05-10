"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { AttendanceView } from "@/app/_components/AttendanceView";
import { useFetch } from "@/app/_hooks/useFetch";
import { RideDetailResponse } from "@/app/_types/response/rideResponse";
import { notFound, useParams, useRouter } from "next/navigation";
import { FormButton } from "@/app/_components/FormButton";

export default function Page() {
  const params = useParams<{ teamId: string; rideId: string }>();
  const teamId = params.teamId;
  const rideId = params.rideId;
  const router = useRouter();

  const { data, error, isLoading } = useFetch<RideDetailResponse>(
    `/api/admin/teams/${teamId}/rides/${rideId}`
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) {
    if (error.message?.includes("404") || error.status === 404) {
      notFound();
    }
  }
  if (!data?.ride) return null;

  return (
    <div className="app-page">
      <div className="app-container max-w-3xl">
      <div className="app-card min-w-0 overflow-hidden p-4 md:p-8">
        <h1 className="app-section-title mb-6 md:mb-8">
          参加者・欠席者一覧
        </h1>

        <AttendanceView ride={data.ride} />

        <div className="mt-8 flex justify-center">
          <FormButton
            label="配車詳細に戻る"
            type="button"
            onClick={() =>
              router.push(`/admin/teams/${teamId}/rides/${rideId}`)
            }
            className="!w-full !max-w-[300px] py-3 text-base"
          />
        </div>
      </div>
      </div>
    </div>
  );
}
