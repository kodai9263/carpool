'use client';

import { useMemo } from "react";

function getValueByPath(obj: any, path: (string | number)[]) {
  let current = obj;

  for(const key of path) {
    if (current == null) return undefined;

    current = current[key];
  }

  return current;
}

/**
 * 他の行で選ばれている ID を集めて「除外リスト(Set)」を作るフック
 *
 * @param items 全行（watchで監視している値）
 * @param currentIndex 今の行（ここは除外対象に含めない）
 * @param path 抽出したいIDの場所（例: ["availabilityDriverId"], ["rideAssignments"]）
 */
export function useExcludeIds<T>(
  items: T[] | undefined,
  currentIndex: number,
  path: (string | number)[]
) {
  // 自分以外の行で選択されているIDを集めて、重複選択を防ぐための集合を作る
  return useMemo(() => {
    if (!items) return;
    const set = new Set<number>();

    items.forEach((item, i) => {
      if (i === currentIndex) return;

      const value = getValueByPath(item, path);

      // 子どもの配列の場合　childIdを集める
      if (Array.isArray(value)) {
        value.forEach((assignment) => {
          const id = assignment.childId;
          if (id && id !== 0) set.add(id);
        });
      }
      // ドライバーの場合
      else {
        const id = value as number;
        if (id && id !== 0) set.add(id);
      }
    });

    return set;
  }, [items, currentIndex, path]);
}