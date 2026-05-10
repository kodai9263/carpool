'use client';

import Link from "next/link";
import { CalendarDays, Car, Home } from 'lucide-react';
import { useParams, usePathname } from "next/navigation";
import { AddToHomeScreenButton } from "@/app/_components/AddToHomeScreenButton";

export const Sidebar: React.FC = () => {
  const params = useParams<{ teamId: string}>();
  const teamId = params.teamId;
  const pathname = usePathname();
  const ridesHref = `/member/teams/${teamId}/rides`;
  const isRidesActive = pathname === ridesHref || pathname.startsWith(`${ridesHref}/`);

  return (
    <>
      {/* デスクトップ用サイドバー */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col justify-between border-r border-gray-100 bg-white/90 px-4 py-5 shadow-sm backdrop-blur-xl md:flex">
        <div>
          <Link href={ridesHref} className="mb-7 flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
              <Car size={20} strokeWidth={2.35} />
            </span>
            <span className="text-lg font-bold tracking-tight text-teal-800">Carpool</span>
          </Link>

          <nav className="space-y-1">
            <Link
              href={ridesHref}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                isRidesActive
                  ? "bg-teal-50 font-semibold text-teal-800"
                  : "font-medium text-gray-600 hover:bg-teal-50 hover:text-teal-800"
              }`}
            >
              <CalendarDays size={18} />
              <span>配車ダッシュボード</span>
            </Link>
          </nav>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-3">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
            <Home size={18} />
          </div>
          <p className="text-xs font-semibold leading-5 text-teal-900">
            PINコードで参加中
          </p>
          <p className="mt-1 text-xs leading-5 text-teal-700">
            配車結果と回答状況を確認できます。
          </p>
        </div>
      </aside>

      {/* モバイル用下部ナビゲーション */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/80 shadow-lg backdrop-blur md:hidden">
        <div className="flex justify-around items-center h-16 px-2">
          <Link href={ridesHref} className="flex min-w-[72px] flex-col items-center text-xs font-semibold text-teal-700 transition hover:opacity-80">
            <Car size={24} />
            <span className="mt-1">配車</span>
          </Link>
          <AddToHomeScreenButton className="flex min-w-[60px] flex-col items-center text-xs text-gray-700 transition hover:text-teal-700" />
        </div>
      </nav>
    </>
  );
}
