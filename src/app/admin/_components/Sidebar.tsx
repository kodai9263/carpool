'use client';

import Link from "next/link";
import { supabase } from "@/utils/supabase";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";
import {
  Car,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  UserCircle,
  Users,
} from "lucide-react";
import { useParams, usePathname } from "next/navigation";
import { AddToHomeScreenButton } from "@/app/_components/AddToHomeScreenButton";

const GUEST_EMAIL = "guest@carpool.demo";

const navItemClass = "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-teal-50 hover:text-teal-800";
const activeNavItemClass = "flex w-full items-center gap-3 rounded-lg bg-teal-50 px-3 py-2.5 text-sm font-semibold text-teal-800";

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
          <span>デモ利用中</span>
          <span className="hidden sm:inline">—</span>
          <Link href="/signup" className="underline underline-offset-2 hover:text-amber-950 transition-colors">
            自分のチームを無料で作る
          </Link>
        </div>
      )}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-56 flex-col justify-between border-r border-gray-100 bg-white/90 px-4 py-5 shadow-sm backdrop-blur-xl md:flex">
        <div>
          <Link href="/admin/teams" className="mb-7 flex items-center gap-2.5 px-1">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]">
              <Car size={20} strokeWidth={2.35} />
            </span>
            <span className="text-lg font-bold tracking-tight text-teal-800">Carpool</span>
          </Link>

          <nav className="space-y-1">
            <Link
              href="/admin/teams"
              className={isActive('/admin/teams') && !teamId ? activeNavItemClass : navItemClass}
            >
              <LayoutDashboard size={18} />
              <span>ダッシュボード</span>
            </Link>

          {teamId && (
            <>
              <Link
                href={`/admin/teams/${teamId}`}
                className={pathname === `/admin/teams/${teamId}` ? activeNavItemClass : navItemClass}
              >
                <Users size={18} />
                <span>チーム</span>
              </Link>
              <Link
                href={`/admin/teams/${teamId}/members`}
                className={isActive(`/admin/teams/${teamId}/members`) ? activeNavItemClass : navItemClass}
              >
                <User size={18} />
                <span>メンバー</span>
              </Link>
              <Link
                href={`/admin/teams/${teamId}/rides`}
                className={isActive(`/admin/teams/${teamId}/rides`) ? activeNavItemClass : navItemClass}
              >
                <Car size={18} />
                <span>配車</span>
              </Link>
            </>
          )}
          </nav>

          {!isGuest && (
            <div className="mt-7 border-t border-gray-100 pt-4">
              <p className="mb-2 px-3 text-xs font-semibold text-gray-400">設定</p>
              <div className="space-y-1">
                <Link
                  href="/admin/profile"
                  className={isActive('/admin/profile') ? activeNavItemClass : navItemClass}
                >
                  <UserCircle size={18} />
                  <span>プロフィール</span>
                </Link>
                {teamId && (
                  <Link href={`/admin/teams/${teamId}`} className={pathname === `/admin/teams/${teamId}` ? activeNavItemClass : navItemClass}>
                    <Settings size={18} />
                    <span>チーム設定</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1 border-t border-gray-100 pt-4">
          <button type="button" onClick={handleLogout} className={navItemClass}>
            <LogOut size={18} />
            <span>ログアウト</span>
          </button>
        </div>
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
          <button type="button" onClick={handleLogout} className={mobileNavItemClass}>
            <LogOut size={22} /><span>退出</span>
          </button>
        </div>
      </nav>
    </>
  );
};
