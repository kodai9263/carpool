'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-md w-full space-y-6">
        {/* イラスト風のエモジ */}
        <div className="text-8xl mb-4">😵</div>
        
        <h1 className="text-4xl font-bold text-gray-800">
          エラーが発生しました
        </h1>
        
        <p className="text-gray-600 text-lg">
          申し訳ございません。<br />
          予期しない問題が発生しました。
        </p>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center h-12 px-8 rounded-lg bg-[#0F766E] hover:bg-[#0D6B64] text-white font-medium transition-all hover:shadow-lg"
          >
            もう一度試す
          </button>
          <a
            href="/"
            className="flex-1 inline-flex items-center justify-center h-12 px-8 rounded-lg border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all"
          >
            トップに戻る
          </a>
        </div>
      </div>
    </div>
  );
}