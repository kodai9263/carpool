'use client';

import { useMemo } from "react";

interface Child {
  id: number;
  name: string;
}

/**
 * 同じドライバー内で重複している子供を検出するフック
 * @param driverAssignments 現在のドライバーの割り当てリスト
 * @param childrenList 全子供のリスト
 * @returns 重複している子供の名前の配列
 */
export function useDuplicateChildren(
  driverAssignments: { childId: number }[] | undefined,
  childrenList: Child[]
): string[] {
  return useMemo(() => {
    const childIdCounts = new Map<number, number>();

    // 各子供IDの出現回数をカウント
    driverAssignments?.forEach((assignment) => {
      if (assignment.childId && assignment.childId !== 0) {
        childIdCounts.set(
          assignment.childId,
          (childIdCounts.get(assignment.childId) || 0) + 1
        );
      }
    });

    // 2回以上出現している子供IDを取得
    const duplicates:number[] = [];
    childIdCounts.forEach((count, childId) => {
      if (count > 1) {
        duplicates.push(childId);
      }
    });

    // 重複している子どもの名前を取得
    return duplicates
      .map((childId) => {
        const child = childrenList.find((c) => c.id === childId);
        return child ? child.name : null;
      })
      .filter((name): name is string => name !== null);
  }, [driverAssignments, childrenList]);
}