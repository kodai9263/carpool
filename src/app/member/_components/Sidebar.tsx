'use client';

import Link from "next/link";
import { Home, Car } from 'lucide-react';

export const Sidebar: React.FC = () => {

  return (
    <aside className="flex flex-col justify-between items-center bg-[#C8EEEC] w-20 min-h-screen py-6">
      <nav className="flex flex-col items-center space-y-8">
        <Link href="" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <Home size={28} />
          <span className="mt-1">ホーム</span>
        </Link>

        <Link href="" className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <Car size={28} />
          <span className="mt-1">配車</span>
        </Link>
      </nav>
    </aside>
  );
}