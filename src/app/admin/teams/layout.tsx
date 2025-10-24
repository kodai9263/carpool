import type { Metadata } from "next";
import { Sidebar } from "../_components/Sidebar";

export const metadata: Metadata = {
  title: "Carpool",
  description: "チームの移動、もう迷わない",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          {children}
        </main>
      </div>
  );
}