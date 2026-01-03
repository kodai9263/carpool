'use client';

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import { Ride } from "@/app/_types/ride";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { NewButton } from "../../_components/NewButton";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import PaginationNav from "@/app/_components/PaginationNav";
import { formatDate } from "@/utils/formatDate";

export default function Page() {
  const [page, setPage] = useState(1);
  const { teamId } = useParams<{ teamId: string }>();

  const url = useMemo(() => {
    return `/api/admin/teams/${teamId}/rides?page=${page}`;
  }, [teamId, page]);

  const { data, error, isLoading } = useFetch(url);

  if (!data) return
  const rides = (data.rides || []) as Ride[];
  const totalPages = data.totalPages || 1;
  const delta = data.delta;

  if (!teamId) return <LoadingSpinner />
  if (isLoading) return <LoadingSpinner />
  if (error) return <div>エラーが発生しました。</div>

  return (
    <div className="min-h-screen flex justify-center items-start py-10">
      <div className="w-[500px] p-8 rounded-xl shadow-lg bg-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-center flex-1 -ml-6">🚗 配車一覧</h1>
          <NewButton 
            href={`/admin/teams/${teamId}/rides/new`}
          />
        </div>

        <div className="space-y-4">
          {rides.map((ride: Ride) => {
            return(
              <div 
                key={ride.id}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-[#5d9b94] hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Calendar size={24} className="text-[#5d9b94]" />
                    <Link 
                      href={`/admin/teams/${teamId}/rides/${ride.id}`}
                      className="text-lg font-medium hover:text-[#5d9b94] transition-colors"
                    >
                      {formatDate(ride.date)}
                    </Link>
                  </div>
                  <Link
                    href={`/admin/teams/${teamId}/rides/${ride.id}`}
                    className="flex items-center gap-1 text-[#2f6f68] font-medium hover:underline"
                  >
                  <ChevronRight size={20} />
                  </Link>
                  </div>
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
              delta={delta}
            />
          )}
        </div>
      </div>
    </div>
  );
}