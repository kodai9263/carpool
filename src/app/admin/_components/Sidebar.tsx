'use client';

import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import { Car, User, Users, LogOut, UserCircle } from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { AddToHomeScreenButton } from "@/app/_components/AddToHomeScreenButton";

const GUEST_EMAIL = "guest@carpool.demo";

const navItemClass = "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs text-gray-500 hover:bg-[#5d9b94]/10 hover:text-[#5d9b94] transition-all duration-200 w-16";
const activeNavItemClass = "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs text-[#5d9b94] bg-[#5d9b94]/10 w-16";

const mobileNavItemClass = "flex flex-col items-center gap-0.5 text-xs text-gray-500 hover:text-[#5d9b94] transition-colors duration-200 min-w-[56px] py-1";
const activeMobileNavItemClass = "flex flex-col items-center gap-0.5 text-xs text-[#5d9b94] min-w-[56px] py-1";

export const Sidebar: React.FC = () => {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const pathname = usePathname();
  const { session } = useSupabaseSession();
  const isGuest = session?.user.email === GUEST_EMAIL;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* デモ利用中バナー */}
      {isGuest && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400 text-amber-900 text-sm font-medium flex items-center justify-center gap-3 py-2 px-4">
          <span>🎭 デモ利用中</span>
          <span className="hidden sm:inline">—</span>
          <Link href="/signup" className="underline underline-offset-2 hover:text-amber-950 transition-colors">
            自分のチームを無料で作る →
          </Link>
        </div>
      )}

      {/* デスクトップ用サイドバー */}
      <aside className="hidden md:flex flex-col justify-between items-center fixed left-0 top-0 w-20 h-screen py-6 bg-white/50 backdrop-blur-xl border-r border-white/40 shadow-sm z-40">
        <nav className="flex flex-col items-center gap-2">
          {teamId && (
            <>
              <Link
                href={`/admin/teams/${teamId}/rides`}
                className={isActive(`/admin/teams/${teamId}/rides`) ? activeNavItemClass : navItemClass}
              >
                <Car size={24} /><span>配車一覧</span>
              </Link>
              <Link
                href={`/admin/teams/${teamId}/members`}
                className={isActive(`/admin/teams/${teamId}/members`) ? activeNavItemClass : navItemClass}
              >
                <User size={24} /><span>メンバー一覧</span>
              </Link>
            </>
          )}
          <Link
            href="/admin/teams"
            className={isActive('/admin/teams') && !teamId ? activeNavItemClass : navItemClass}
          >
            <Users size={24} /><span>チーム一覧</span>
          </Link>
          {!isGuest && (
            <Link
              href="/admin/profile"
              className={isActive('/admin/profile') ? activeNavItemClass : navItemClass}
            >
              <UserCircle size={24} /><span>プロフィール</span>
            </Link>
          )}
        </nav>

        <button
          onClick={handleLogout}
          className={navItemClass}
        >
          <LogOut size={24} /><span>ログアウト</span>
        </button>
      </aside>

      {/* モバイル用下部ナビゲーション */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-t border-gray-100 shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {teamId && (
            <>
              <Link
                href={`/admin/teams/${teamId}/rides`}
                className={isActive(`/admin/teams/${teamId}/rides`) ? activeMobileNavItemClass : mobileNavItemClass}
              >
                <Car size={22} /><span>配車</span>
              </Link>
              <Link
                href={`/admin/teams/${teamId}/members`}
                className={isActive(`/admin/teams/${teamId}/members`) ? activeMobileNavItemClass : mobileNavItemClass}
              >
                <User size={22} /><span>メンバー</span>
              </Link>
            </>
          )}
          <Link
            href="/admin/teams"
            className={isActive('/admin/teams') && !teamId ? activeMobileNavItemClass : mobileNavItemClass}
          >
            <Users size={22} /><span>チーム</span>
          </Link>
          {!isGuest && (
            <Link
              href="/admin/profile"
              className={isActive('/admin/profile') ? activeMobileNavItemClass : mobileNavItemClass}
            >
              <UserCircle size={22} /><span>プロフィール</span>
            </Link>
          )}
          <AddToHomeScreenButton className={mobileNavItemClass} />
          <button onClick={handleLogout} className={mobileNavItemClass}>
            <LogOut size={22} /><span>ログアウト</span>
          </button>
        </div>
      </nav>
    </>
  );
};
