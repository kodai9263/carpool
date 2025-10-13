import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
