'use client';

import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { Car, User, Users, LogOut } from "lucide-react";
import { useParams } from "next/navigation";

export const Sidebar: React.FC = () => {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'
  }

  return (
    <>
      {/* デスクトップ用サイドバー */}
      <aside className="hidden md:flex flex-col justify-between items-center bg-white w-20 min-h-screen py-6 shadow-lg">
        <nav className="flex flex-col items-center space-y-8">
          {teamId && (
            <>
              <Link href={`/admin/teams/${teamId}/rides`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
                <Car size={28} /><span className="mt-1">配車一覧</span>
              </Link>

              <Link href={`/admin/teams/${teamId}/members`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
                <User size={28} /><span className="mt-1">メンバー一覧</span>
              </Link>
            </>
          )}
          <Link href="/admin/teams" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
            <Users size={28} /><span className="mt-1">チーム一覧</span>
          </Link>
        </nav>

        <div className="flex flex-col items-center">
          <button
            onClick={handleLogout}
            className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80"
          >
            <LogOut size={28} /><span className="mt-1">ログアウト</span>
          </button>
        </div>
      </aside>

      {/* モバイル用下部ナビゲーション */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {teamId && (
            <>
              <Link href={`/admin/teams/${teamId}/rides`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80 min-w-[60px]">
                <Car size={24} /><span className="mt-1">配車</span>
              </Link>

              <Link href={`/admin/teams/${teamId}/members`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80 min-w-[60px]">
                <User size={24} /><span className="mt-1">メンバー</span>
              </Link>
            </>
          )}
          <Link href="/admin/teams" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80 min-w-[60px]">
            <Users size={24} /><span className="mt-1">チーム</span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80 min-w-[60px]"
          >
            <LogOut size={24} /><span className="mt-1">ログアウト</span>
          </button>
        </div>
      </nav>
    </>
  );
}
