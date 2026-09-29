"use client";

import { useFetch } from "@/app/_hooks/useFetch";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { LoadingSpinner } from "@/app/_components/LoadingSpinner";
import { api } from "@/utils/api";
import { useState } from "react";
import toast from "react-hot-toast";

type FeedbackItem = {
  id: number;
  category: string;
  message: string;
  replyEmail: string | null;
  createdAt: string;
  notificationStatus: string;
  notificationErrorCode: string | null;
  notificationResponseCode: number | null;
  notificationAcceptedAt: string | null;
  reviewedAt: string | null;
};
type FeedbackPage = { items: FeedbackItem[]; nextCursor: number | null };
type FeedbackSummary = { canAccess: boolean; unreadCount: number };

const formatDate = (value: string) => new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const notificationLabel = (status: string) => {
  switch (status) {
    case "accepted": return "メール送信受付済み";
    case "failed": return "メール送信失敗";
    case "pending": return "メール状態未記録（要確認）";
    default: return "過去分・送信状態不明";
  }
};

export default function FeedbackPage() {
  const [before, setBefore] = useState<number | null>(null);
  const [workingId, setWorkingId] = useState<number | null>(null);
  const { token } = useSupabaseSession();
  const url = before === null ? "/api/admin/feedback" : `/api/admin/feedback?before=${before}`;
  const { data, error, isLoading, mutate } = useFetch<FeedbackPage>(url);
  const { data: summary, mutate: mutateSummary } = useFetch<FeedbackSummary>("/api/admin/feedback/summary");

  const markReviewed = async (id: number) => {
    if (!token) return;
    setWorkingId(id);
    try {
      await api.patch(`/api/admin/feedback/${id}`, {}, token);
      await Promise.all([mutate(), mutateSummary()]);
      toast.success("確認済みにしました");
    } catch {
      toast.error("更新に失敗しました");
    } finally {
      setWorkingId(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="app-page">フィードバックを表示できません。権限を確認してください。</div>;
  if (!data) return <LoadingSpinner />;

  return (
    <div className="app-page mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-gray-950">フィードバック</h1>
      <p className="mt-2 text-sm text-gray-600">
        未確認 {summary?.canAccess ? summary.unreadCount : "—"} 件。メールの受信状況に関係なく投稿を確認できます。
      </p>

      <div className="mt-6 space-y-4">
        {data.items.length === 0 && <div className="app-card p-6 text-sm text-gray-600">投稿はありません。</div>}
        {data.items.map((item) => (
          <article key={item.id} className="app-card space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-gray-950">#{item.id} · {item.category}</span>
              <span className="text-gray-500">{formatDate(item.createdAt)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.reviewedAt ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-800"}`}>
                {item.reviewedAt ? "確認済み" : "未確認"}
              </span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-900">{item.message}</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>返信先：{item.replyEmail ?? "記載なし"}</p>
              <p>
                通知：{notificationLabel(item.notificationStatus)}
                {item.notificationErrorCode && `（${item.notificationErrorCode}${item.notificationResponseCode ? ` / SMTP ${item.notificationResponseCode}` : ""}）`}
              </p>
              {item.notificationAcceptedAt && <p>メール送信受付：{formatDate(item.notificationAcceptedAt)}</p>}
            </div>
            {!item.reviewedAt && (
              <button
                type="button"
                onClick={() => markReviewed(item.id)}
                disabled={workingId === item.id}
                className="app-button-secondary disabled:opacity-50"
              >
                {workingId === item.id ? "更新中…" : "確認済みにする"}
              </button>
            )}
          </article>
        ))}
      </div>

      {data.nextCursor && (
        <button
          type="button"
          onClick={() => setBefore(data.nextCursor)}
          className="app-button-secondary mt-6"
        >
          古い投稿を見る
        </button>
      )}
      {before !== null && (
        <button
          type="button"
          onClick={() => setBefore(null)}
          className="ml-3 mt-6 text-sm font-semibold text-teal-800 underline"
        >
          最新に戻る
        </button>
      )}
    </div>
  );
}
