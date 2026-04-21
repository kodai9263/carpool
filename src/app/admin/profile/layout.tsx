'use client';

import { Sidebar } from "../_components/Sidebar";
import { useRouteGuard } from "../_hooks/useRouteGuard";
import { useSupabaseSession } from "@/app/_hooks/useSupabaseSession";

const GUEST_EMAIL = "guest@carpool.demo";

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  useRouteGuard();
  const { session } = useSupabaseSession();
  const isGuest = session?.user.email === GUEST_EMAIL;

  return (
    <div className={`flex ${isGuest ? "pt-10" : ""}`}>
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}