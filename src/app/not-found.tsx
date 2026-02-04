"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-md w-full space-y-6">
        <div className="text-8xl mb-4">🚗💨</div>
        
        <h1 className="text-7xl font-bold text-[#0F766E] mb-2">
          404
        </h1>
        
        <h2 className="text-3xl font-bold text-gray-800">
          迷子になっちゃいました
        </h2>
        
        <p className="text-gray-600 text-lg">
          ページが見つかりません。
        </p>

        <div className="pt-4 flex flex-col gap-3 items-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#0F766E] hover:bg-[#0D6B64] text-white font-medium transition-all hover:shadow-lg w-[240px]"
          >
            前のページに戻る
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center h-10 px-6 rounded-lg border-2 border-gray-300 hover:border-[#0F766E] text-gray-700 hover:text-[#0F766E] font-medium transition-all text-sm w-[240px]"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}