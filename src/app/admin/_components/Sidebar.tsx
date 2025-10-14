'use client';

import Link from "next/link";
import { supabase } from "@/src/utils/supabase";
import { Home, Car, User, Users, LogOut } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'
  }

  return (
    <aside className="flex flex-col justify-between items-center bg-[#C8EEEC] w-20 min-h-screen py-6">
      <nav className="flex flex-col items-center space-y-8">
        <Link href="" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <Home size={28} />
          <span className="mt-1">ホーム</span>
        </Link>

        <Link href="" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <Car size={28} />
          <span className="mt-1">配車</span>
        </Link>

        <Link href="" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <User size={28} />
          <span className="mt-1">メンバー</span>
        </Link>

        <Link href="" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <Users size={28} />
          <span className="mt-1">チーム</span>
        </Link>
      </nav>

      <div className="flex flex-col items-center">
        <button
          onClick={handleLogout}
          className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80"
        >
          <LogOut size={28} />
          <span className="mt-1">ログアウト</span>
        </button>
      </div>
    </aside>
  );
}