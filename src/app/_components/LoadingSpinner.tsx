'use client';

import { Loader2 } from "lucide-react";

export const LoadingSpinner = () => {
  return (
    <div className="app-page flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/80 bg-white/80 px-8 py-7 shadow-[0_18px_50px_rgba(15,118,110,0.10)] backdrop-blur">
        <Loader2 className="animate-spin text-teal-700" size={34} />
        <p className="text-sm font-medium text-gray-500">読み込み中...</p>
      </div>
    </div>
  );
};
