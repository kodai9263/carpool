// ページネーションの計算を行う

export interface PaginationParams {
  page?: number | string | null;
  perPage?: number | string | null;
  total: number;
}

export interface PaginationResult {
  page: number;
  perPage: number;
  skip: number;
  totalPages: number;
}

export function calculatePagination({
  page: pageParam,
  perPage: perPageParam,
  total,
}: PaginationParams): PaginationResult {
  // ページ番号の検証
  const p = typeof pageParam === 'string' ? Number(pageParam) : (pageParam ?? 1);
  const page = Number.isFinite(p) && p > 0 ? Math.floor(p) : 1;

  // 1ページ当たりの件数の検証(最大50件)
  const pp = typeof perPageParam === 'string' ? Number(perPageParam) : (perPageParam ?? 5);
  const perPage = Number.isFinite(pp) && pp > 0 ? Math.min(50, Math.floor(pp)) : 5;

  // スキップ数の計算
  const skip = (page - 1) * perPage;

  // 合計ページの計算
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return {
    page,
    perPage,
    skip,
    totalPages,
  };
}