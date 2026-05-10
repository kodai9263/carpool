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
        type="button"
        aria-label="前のページ"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="app-icon-button min-h-10 min-w-10 disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      {pages.map((p, idx) => 
        p === "..." ? (
          <span key={`gap-${idx}`} className="select-none px-2 text-sm font-medium text-gray-400">...</span>
        ) : (
          <button
            type="button"
            key={p}
            aria-current={p === page ? "page" : undefined}
            onClick={() => onPageChange(p as number)}
            className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-teal-700/10 ${
              p === page
                ? "border-teal-700 bg-teal-700 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-600 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="次のページ"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="app-icon-button min-h-10 min-w-10 disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
