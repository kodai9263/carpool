"use client";

import { Sidebar } from "../_components/Sidebar";
import { useRouteGuard } from "../_hooks/useRouteGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useRouteGuard();

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
