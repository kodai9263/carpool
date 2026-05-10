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
        "app-button-secondary w-full sm:w-auto"
      }
    >
      参加者・欠席者一覧を見る
    </button>
  );
}
