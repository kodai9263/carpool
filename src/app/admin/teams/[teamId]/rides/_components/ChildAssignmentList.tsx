"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { useExcludeIds } from "@/app/admin/_hooks/useExcludeIds";
import { useSyncRowsWithSeats } from "@/app/admin/_hooks/useSyncRowsWithSeats";
import { Plus, User, X } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

interface Props {
  index: number;
  childrenList: { id: number; name: string; currentGrade: number | null }[];
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
}

export default function ChildAssignmentList({
  index,
  childrenList,
  availabilityDrivers,
}: Props) {
  const { control, register } = useFormContext<UpdateRideValues>();
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: `drivers.${index}.rideAssignments`,
  });

  // ドライバーの一括取得
  const drivers = useWatch({ control, name: "drivers" }) ?? [];
  const driver = drivers[index];
  const currentAssignments = driver.rideAssignments ?? [];
  const selectedDriverId = driver.availabilityDriverId ?? null;

  // 学年降順ソート（高学年が先、未設定は末尾）
  const sortedChildrenList = useMemo(() => {
    return [...childrenList].sort((a, b) => {
      if (a.currentGrade === null && b.currentGrade === null) return 0;
      if (a.currentGrade === null) return 1;
      if (b.currentGrade === null) return -1;
      return b.currentGrade - a.currentGrade;
    });
  }, [childrenList]);

  const selfSelectedChildIds = useMemo(() => {
    const ids = currentAssignments
      .map((item) => item.childId)
      .filter((childId): childId is number => !!childId);
    return new Set(ids);
  }, [currentAssignments]);

  // 選択されたドライバーの座席数を取得
  const selectedDriverSeats = availabilityDrivers.find(
    (d) => d.id === selectedDriverId
  );
  const seatCount = selectedDriverSeats?.seats ?? 0;

  // ドライバー選択時に座席数分の行を自動追加
  useSyncRowsWithSeats(
    selectedDriverId,
    seatCount,
    fields.length,
    append,
    remove,
    replace,
    currentAssignments
  );

  // 乗車する子どもの数を増やせるかどうかの判定
  const canAddAssignment = fields.length < seatCount;

  // 他ドライバーが選んだchildIdの重複防止
  const excluded = useExcludeIds(drivers, index, ["rideAssignments"]);

  // フックの呼び出しの後に条件チェック
  if (!selectedDriverSeats || !excluded) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 mb-2">乗車する子供</h4>

      {fields.map((item, childIndex) => {
        const currentChildId = currentAssignments[childIndex]?.childId ?? 0;

        return (
          <div
            key={item.id}
            className="flex items-center bg-white p-3 rounded-lg border border-gray-200 min-w-0"
          >
            <User size={18} className="text-gray-600 mr-2 flex-shrink-0" />

            <select
              {...register(
                `drivers.${index}.rideAssignments.${childIndex}.childId`,
                { valueAsNumber: true }
              )}
              className="w-full min-w-0 truncate border-2 border-gray-300 rounded px-2 py-1 text-sm flex-1 focus:border-[#5d9b94] focus:ring-2 focus:ring-[#5d9b94] focus:outline-none"
            >
              <option value={0}></option>

              {sortedChildrenList.map((child) => {
                // 他ドライバーが選んだら無効化、同一ドライバー内で既に選択していたら無効化
                const isDisabled =
                  (excluded.has(child.id) &&
                    !selfSelectedChildIds.has(child.id)) ||
                  (selfSelectedChildIds.has(child.id) &&
                    child.id !== currentChildId);

                return (
                  <option
                    key={child.id}
                    value={child.id}
                    disabled={isDisabled}
                    className={isDisabled ? "text-gray-400 bg-gray-100" : ""}
                  >
                    {child.name} {child.currentGrade ? `(${child.currentGrade}年)` : "(学年未設定)"}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={() => remove(childIndex)}
              className="text-gray-400 hover:text-red-500 transition ml-2 flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}

      {selectedDriverId && seatCount > 0 ? (
        <div className="mt-3">
          {canAddAssignment ? (
            <button
              type="button"
              onClick={() => append({ childId: 0 })}
              className="w-full flex items-center justify-center gap-2 text-[#5d9b94] hover:text-[#4a7d77] transition bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-medium"
            >
              <Plus size={18} />
              <span>あと{seatCount - fields.length}人乗車できます</span>
            </button>
          ) : (
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-700 font-medium">
              {seatCount}人まで乗車可能です
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
