"use client";

import { useRouter } from "next/navigation";

interface AttendanceListButtonProps {
  href: string;
  className?: string;
}

export function AttendanceListButton({ href, className }: AttendanceListButtonProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={
        className ??
        "px-6 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm"
      }
    >
      参加者・欠席者一覧を見る
    </button>
  );
}
