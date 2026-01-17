"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import Link from "next/link";
import PaginationNav from "@/app/_components/PaginationNav";
import { formatDate } from "@/utils/formatDate";
import { usePinFetcher } from "@/app/member/_hooks/usePinFetcher";
import useSWR from "swr";
import { RideListResponse } from "@/app/_types/response/rideResponse";

export default function Page() {
  const [page, setPage] = useState(1);
  const { teamId } = useParams<{ teamId: string }>();

  const fetcher = usePinFetcher();

  const { data, error, isLoading } = useSWR<RideListResponse>(
    `/api/member/teams/${teamId}/rides?page=${page}`,
    fetcher
  );

  const rides = data?.rides;
  const totalPages = data?.totalPages || 1;

  if (!teamId) return <LoadingSpinner />;
  if (isLoading) return <LoadingSpinner />;
  if (error) return <div>エラーが発生しました。</div>;

  return (
    <div className="min-h-screen flex justify-center items-start py-4 md:py-10 px-4">
      <div className="w-full max-w-[500px] p-6 md:p-8 rounded-xl shadow-lg bg-white">
        <h1 className="text-2xl font-bold text-center mb-6">🚗 配車一覧</h1>

        <div className="space-y-4">
          {rides?.map((ride) => {
            return (
              <Link
                key={ride.id}
                href={`/member/teams/${teamId}/rides/${ride.id}`}
                className="block p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Calendar size={24} className="text-[#5d9b94]" />
                  <span className="text-lg font-medium">
                    {formatDate(ride.date)}
                  </span>
                </div>
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
