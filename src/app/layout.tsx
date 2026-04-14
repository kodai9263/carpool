import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { FeedbackWidget } from "./_components/FeedbackWidget";
import { GoogleAnalytics } from "@next/third-parties/google";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://carpool-kappa.vercel.app";

export const metadata: Metadata = {
  title: "Carpool｜少年野球・サッカーの配車管理アプリ",
  description: "LINEやExcelでの配車調整をアプリ1つで解決。配車可否の収集から自動アサインまで、チームの送迎をスムーズに。無料で始められます。",
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Carpool',
  },
  openGraph: {
    title: "Carpool｜少年野球・サッカーの配車管理アプリ",
    description: "LINEやExcelでの配車調整をアプリ1つで解決。無料で始められます。",
    url: siteUrl,
    siteName: "Carpool",
    images: [
      {
        url: `${siteUrl}/ogp.png`,
        width: 1200,
        height: 630,
        alt: "Carpool - 少年野球・サッカーの配車管理アプリ",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Carpool｜少年野球・サッカーの配車管理アプリ",
    description: "LINEやExcelでの配車調整をアプリ1つで解決。無料で始められます。",
    images: [`${siteUrl}/ogp.png`],
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
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID!} />
      </body>
    </html>
  );
}
