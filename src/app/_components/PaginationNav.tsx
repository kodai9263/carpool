'use client';

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;         // 現在のページ
  totalPages: number;   // 総ページ数
  onPageChange: (p: number) => void;
  delta?: number;       // 現在のページの前後に表示する数
}

// ページ番号を生成
export function getPages(current: number, total: number, delta = 2): (number | '...')[] {
  const pages: (number | '...')[] = [];             // 出力するページ番号を入れる配列
  let last: number | null = null;                   // 前のページ番号を記録
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= delta) { // 最初のページ、最後のページ、現在のページからdelta分を表示
      if (last && i - last > 1) pages.push('...');
      pages.push(i);
      last = i;
    }
  }
  return pages;
}

export default function PaginationNav({ page, totalPages, onPageChange, delta = 2, }: Props) {
  const pages = getPages(page, totalPages, delta);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
      >
        <ChevronLeft size={24} />
      </button>

      {pages.map((p, idx) => 
        p === "..." ? (
          <span key={`gap-${idx}`} className="px-2 select-none">...</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`px-3 py-1 border rounded ${p === page ? 'bg-[#2f6f68] text-white border-[#2f6f68]' : 'hover:bg-gray-100'}`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-100"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  );
}