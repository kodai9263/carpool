"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CircleHelp, Home } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="app-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="app-card w-full max-w-md p-6 md:p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <CircleHelp size={30} />
        </div>
        
        <h1 className="mb-2 text-6xl font-bold tracking-tight text-teal-800">
          404
        </h1>
        
        <h2 className="text-2xl font-bold text-gray-950">
          ページが見つかりません
        </h2>
        
        <p className="mt-3 text-sm leading-6 text-gray-500">
          URLが変更されたか、ページが削除された可能性があります。
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="app-button-primary w-full"
          >
            <ArrowLeft size={16} />
            前のページに戻る
          </button>
          
          <Link
            href="/"
            className="app-button-secondary w-full"
          >
            <Home size={16} />
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
