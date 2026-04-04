'use client';

import { useEffect } from "react";

/**
 * ドライバーの座席数に合わせて割当行を管理するカスタムフック。
 * 空行の自動追加は行わず、以下のみを担う：
 * - ドライバーが未選択 or 座席数0の場合に全行をクリア
 * - 値のある行より前にある空行を除去（auto-assign後の誤挿入を防ぐ）
 */
export function useSyncRowsWithSeats(
  selectedDriverId: number | null,
  seatCount: number,
  currentCount: number,
  remove: (index: number) => void,
  replace?: (value: { childId: number }[]) => void,
  currentAssignments?: { childId: number }[]
) {
  useEffect(() => {
    if (!currentAssignments) return;

    // クリア時: 全ての行を削除
    if (!selectedDriverId || seatCount <= 0) {
      if (currentCount > 0 && replace) {
        replace([]);
      }
      return;
    }

    // 値のある行より前に空行がある場合は1つずつ除去する
    const hasExistingAssignments = currentAssignments.some(
      (a) => a.childId && a.childId !== 0
    );
    if (hasExistingAssignments) {
      for (let i = 0; i < currentAssignments.length; i++) {
        const isEmpty =
          !currentAssignments[i]?.childId || currentAssignments[i].childId === 0;
        const hasFilledAfter = currentAssignments
          .slice(i + 1)
          .some((a) => a.childId && a.childId !== 0);
        if (isEmpty && hasFilledAfter) {
          remove(i);
          break;
        }
      }
    }
  }, [selectedDriverId, seatCount, currentCount, remove, replace, currentAssignments]);
}
