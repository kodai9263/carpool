'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

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
    <div className="app-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="app-card w-full max-w-md p-6 md:p-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <AlertTriangle size={30} />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight text-gray-950">
          エラーが発生しました
        </h1>
        
        <p className="mt-3 text-sm leading-6 text-gray-500">
          申し訳ございません。<br />
          予期しない問題が発生しました。
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="app-button-primary flex-1"
          >
            <RotateCcw size={16} />
            もう一度試す
          </button>
          <a
            href="/"
            className="app-button-secondary flex-1"
          >
            <Home size={16} />
            トップに戻る
          </a>
        </div>
      </div>
    </div>
  );
}
