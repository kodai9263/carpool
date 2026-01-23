"use client";

import { Sidebar } from "../../_components/Sidebar";
import { useEffect, useState, useCallback } from "react";
import { useParams, usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { teamId } = useParams<{ teamId: string }>();
  const pathname = usePathname();
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  const checkPin = useCallback(() => {
    const pin = sessionStorage.getItem(`pin:${teamId}`);
    setHasPin(pin !== null);
  }, [teamId]);

  useEffect(() => {
    checkPin();
  }, [checkPin, pathname]);

  if (hasPin === null) {
    return null;
  }

  return (
    <div className="flex">
      {hasPin && <Sidebar />}
      <main className={`flex-1 ${hasPin ? 'pb-20 md:pb-0' : ''}`}>{children}</main>
    </div>
  );
}
