'use client';

import { useEffect, useRef } from "react";

/**
 * ドライバーの座席数に合わせて割当行数を自動追加するカスタムフック
 *
 * @param selectedDriverId 選択された availabilityDriverId
 * @param seatCount そのドライバーの seats（乗車可能人数）
 * @param currentCount 現在の割当行数（fields.length）
 */
export function useSyncRowsWithSeats(
  selectedDriverId: number | null,
  seatCount: number,
  currentCount: number,
  append: (value: { childId: number }, options?: { shouldFocus?: boolean }) => void,
  remove: (index: number) => void,
  replace?: (value: { childId: number}[]) => void,
  currentAssignments?: { childId: number }[] // 現在の割当を監視
) {
  const prevDriverIdRef = useRef<number | null>(null);
  const prevSeatCountRef = useRef<number>(0);

  // 既存データかどうかを判定
  const hasExistingAssignments = currentAssignments?.some(a => a.childId && a.childId !== 0) ?? false;

  useEffect(() => {
    if (!currentAssignments) return;
    const isDriverChanged = prevDriverIdRef.current !== selectedDriverId;
    const isSeatCountChanged = prevSeatCountRef.current !== seatCount;

    // クリア時: 全ての行を削除
    if (!selectedDriverId || seatCount <= 0) {
      if (currentCount > 0 && replace) {
        replace([]);
      } 

      prevDriverIdRef.current = selectedDriverId;
      prevSeatCountRef.current = seatCount;
      return;
    }

    // 既存データがある場合は自動追加しない(編集時の既存データを保護)
    if (hasExistingAssignments) {
      prevDriverIdRef.current = selectedDriverId;
      prevSeatCountRef.current = seatCount;
      return;
    }

    // ドライバー変更時で座席数変更時: 行数を座席数に合わせる
    if (isDriverChanged || isSeatCountChanged) {
      // 不足している場合
      if (currentCount < seatCount) {
        const diff = seatCount - currentCount;
        for (let i = 0; i < diff; i++) {
          append({ childId: 0 }, { shouldFocus: false });
        }
      } else if (currentCount > seatCount) {
        // 余分な場合
        const diff = currentCount - seatCount;
        for (let i = 0; i < diff; i++) {
          remove(currentCount - 1 - i);
        }
      }
    }

    prevDriverIdRef.current = selectedDriverId;
    prevSeatCountRef.current = seatCount;
  }, [selectedDriverId, seatCount, currentCount, append, remove, replace, currentAssignments, hasExistingAssignments]);
}