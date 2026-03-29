import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { FeedbackWidget } from "./_components/FeedbackWidget";

export const metadata: Metadata = {
  title: "Carpool",
  description: "チームの移動、もう迷わない",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',  // iPhoneのホーム画面アイコン用
  },
  manifest: '/manifest.json',  // Web App Manifestを参照
  appleWebApp: {               // iPhone Safariでアプリ風動作にする設定
    capable: true,
    statusBarStyle: 'default',
    title: 'Carpool',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',  // ブラウザUIのテーマカラー
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
