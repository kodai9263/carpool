"use client";

import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { useFetch } from "@/app/_hooks/useFetch";
import type { SettlementListResponse, SettlementStatus } from "@/app/_types/settlement";
import { ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const STATUS_LABELS: Record<SettlementStatus, string> = {
  draft: "下書き",
  pending: "精算待ち",
  completed: "精算完了",
  voiding: "取消精算中",
  voided: "取消",
};

function displayDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "numeric", day: "numeric", weekday: "short" }).format(new Date(value));
}

function yen(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}円`;
}

export default function Page() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data, error, isLoading } = useFetch<SettlementListResponse>(`/api/admin/teams/${teamId}/settlements`);

  if (isLoading || !data) return error ? (
    <div className="app-page"><div className="app-container"><div className="app-card p-6 text-sm text-red-700">精算一覧を読み込めませんでした。</div></div></div>
  ) : <LoadingSpinner />;

  return (
    <div className="app-page">
      <div className="app-container max-w-4xl">
        <header className="mb-6">
          <p className="text-sm font-semibold text-teal-700">チーム会計</p>
          <h1 className="app-section-title mt-1 flex items-center gap-2"><ReceiptText size={26} className="text-teal-700" />遠征費精算</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">配車ごとの費用、家庭の立替、受領・返金の状況を確認できます。</p>
        </header>

        {data.settlements.length === 0 ? (
          <div className="app-card p-8 text-center">
            <p className="font-semibold text-gray-950">まだ精算はありません</p>
            <p className="mt-2 text-sm text-gray-600">配車詳細の「この配車の精算を始める」から作成できます。</p>
            <Link href={`/admin/teams/${teamId}/rides`} className="app-button-primary mt-5">配車一覧へ</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {data.settlements.map((settlement) => (
              <Link key={settlement.id} href={`/admin/teams/${teamId}/settlements/${settlement.id}`} className="app-card block p-4 transition hover:border-teal-300 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-600">{displayDate(settlement.sourceDate)}</p>
                    <p className="mt-1 break-words text-lg font-bold text-gray-950">{settlement.sourceDestination}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">{STATUS_LABELS[settlement.status]}</span>
                    <span className="font-bold text-gray-950">{settlement.totalAmount === null ? "未入力" : yen(settlement.totalAmount)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
