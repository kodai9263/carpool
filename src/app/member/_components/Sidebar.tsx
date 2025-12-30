'use client';

import Link from "next/link";
import { Car } from 'lucide-react';
import { useParams } from "next/navigation";

export const Sidebar: React.FC = () => {
  const params = useParams<{ teamId: string}>();
  const teamId = params.teamId;

  return (
    <aside className="flex flex-col justify-between items-center bg-[#C8EEEC] w-20 min-h-screen py-6">
      <nav className="flex flex-col items-center space-y-8">
        <Link href={`/member/teams/${teamId}/rides`} className="flex flex-col items-center text-xs text-gray-800 hover:opacity-80">
          <Car size={28} />
          <span className="mt-1">配車一覧</span>
        </Link>
      </nav>
    </aside>
  );
}