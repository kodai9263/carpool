'use client';

import Link from "next/link";
import { Car } from 'lucide-react';
import { useParams } from "next/navigation";

export const Sidebar: React.FC = () => {
  const params = useParams<{ teamId: string}>();
  const teamId = params.teamId;

  return (
    <>
      {/* デスクトップ用サイドバー */}
      <aside className="hidden md:flex flex-col justify-between items-center bg-white w-20 min-h-screen py-6 shadow-lg">
        <nav className="flex flex-col items-center space-y-8">
          <Link href={`/member/teams/${teamId}/rides`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
            <Car size={28} />
            <span className="mt-1">配車一覧</span>
          </Link>
        </nav>
      </aside>

      {/* モバイル用下部ナビゲーション */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-center items-center h-16 px-2">
          <Link href={`/member/teams/${teamId}/rides`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80 min-w-[60px]">
            <Car size={24} />
            <span className="mt-1">配車一覧</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
