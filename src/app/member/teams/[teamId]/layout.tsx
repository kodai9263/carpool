"use client";

import { Sidebar } from "../../_components/Sidebar";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { teamId } = useParams<{ teamId: string }>();
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    const pin = sessionStorage.getItem(`pin:${teamId}`);
    setHasPin(pin !== null);
  }, [teamId]);

  return (
    <div className="flex">
      {hasPin && <Sidebar />}
      <main className="flex-1">{children}</main>
    </div>
  );
}
