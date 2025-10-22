'use client';

import { Loader2 } from "lucide-react";

export const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center min-h-screen bg-[#b9cdca]">
      <Loader2 className="animate-spin text-[#2f6f68]" size={64}/>
    </div>
  );
}