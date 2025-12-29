'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
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

  if (!teamId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-10">
      <div className="w-[380px] p-6 rounded-md shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">配車一覧</h1>
        </div>

        <div className="space-y-3">
          {rides?.map((ride) => {
            return(
              <div key={ride.id} className="flex justify-between items-center border-t border-[#5d9b94] pt-3">
                <div className="flex w-full items-center gap-2">
                  <Calendar size={28} className="text-2xl" />
                  <Link 
                    href={`/member/teams/${teamId}/rides/${ride.id}`}
                    className="flex-1 text-center text-xl font-medium"
                  >
                    {formatDate(ride.date)}
                  </Link>
                </div>
                <Link
                  href={`/member/teams/${teamId}/rides/${ride.id}`}
                  className="flex items-center gap-1 text-[#2f6f68] font-medium hover:underline"
                >
                  <ChevronRight size={24} />
                </Link>
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
            />
          )}
        </div>
      </div>
    </div>
  );
}