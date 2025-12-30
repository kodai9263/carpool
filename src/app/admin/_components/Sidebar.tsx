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
    <aside className="flex flex-col justify-between items-center bg-[#C8EEEC] w-20 min-h-screen py-6">
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
  );
}