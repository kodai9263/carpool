"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { useExcludeIds } from "@/app/admin/_hooks/useExcludeIds";
import { useSyncRowsWithSeats } from "@/app/admin/_hooks/useSyncRowsWithSeats";
import { Plus, User, X } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

interface Props {
  index: number;
  type: string;
  childrenList: { id: number; name: string; currentGrade: number | null }[];
  availabilityDrivers: {
    id: number;
    guardian: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
  childAvailabilities: { childId: number; availability: boolean; selfDriving: boolean }[];
}

export default function ChildAssignmentList({
  index,
  type,
  childrenList,
  availabilityDrivers,
  childAvailabilities,
}: Props) {
  const { control, register } = useFormContext<UpdateRideValues>();
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: `drivers.${index}.rideAssignments`,
  });

  // ドライバーの一括取得
  const watchedDrivers = useWatch({ control, name: "drivers" });
  const drivers = useMemo(() => watchedDrivers ?? [], [watchedDrivers]);
  const driver = drivers[index];
  const currentAssignments = useMemo(
    () => driver.rideAssignments ?? [],
    [driver.rideAssignments]
  );
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

  // 不参加・自走の子どもをプルダウンから除外
  const participatingChildren = useMemo(() => {
    const notAssignableIds = new Set(
      childAvailabilities
        .filter((ca) => !ca.availability || ca.selfDriving)
        .map((ca) => ca.childId)
    );
    return sortedChildrenList.filter((child) => !notAssignableIds.has(child.id));
  }, [sortedChildrenList, childAvailabilities]);

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
    remove,
    replace,
    currentAssignments
  );

  // 引率者の人数も合算して空き座席を判定
  const escortCount = (driver.escorts ?? []).length;
  const canAddAssignment = (fields.length + escortCount) < seatCount;

  // 同じ方向のドライバー間のみ重複防止（行きと帰りで同じ子供を別々に乗せられるように）
  const currentDirection = driver?.direction ?? 'outbound';
  const sameDirectionDrivers = drivers.filter(
    (d) => (d?.direction ?? 'outbound') === currentDirection
  );
  const sameDirectionIndex = sameDirectionDrivers.findIndex((d) => d === driver);
  const excluded = useExcludeIds(
    sameDirectionDrivers,
    sameDirectionIndex >= 0 ? sameDirectionIndex : index,
    ["rideAssignments"]
  );

  // フックの呼び出しの後に条件チェック
  // 引率者（escort）は seats=0 なので selectedDriverSeats が存在しないが、表示は続ける
  if (!excluded) return null;
  if (type !== 'escort' && !selectedDriverSeats) return null;

  return (
    <div className="space-y-2">
      <h4 className="mb-2 text-sm font-semibold text-gray-700">乗車する子供</h4>

      {fields.map((item, childIndex) => {
        const currentChildId = currentAssignments[childIndex]?.childId ?? 0;

        return (
          <div
            key={item.id}
            className="flex min-w-0 items-center rounded-lg border border-gray-200 bg-white p-3"
          >
            <User size={18} className="text-gray-600 mr-2 flex-shrink-0" />

            <select
              {...register(
                `drivers.${index}.rideAssignments.${childIndex}.childId`,
                { valueAsNumber: true }
              )}
              className="app-select min-w-0 flex-1 truncate py-2 text-sm"
            >
              <option value={0}></option>

              {participatingChildren.map((child) => {
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
              className="ml-2 flex-shrink-0 text-gray-400 transition hover:text-red-500"
            >
              <X size={18} />
            </button>
          </div>
        );
      })}

      {type === 'escort' ? (
        // 引率者: 座席数制限なし、手動追加のみ
        <div className="mt-3">
          <button
            type="button"
            onClick={() => append({ childId: 0 })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
          >
            <Plus size={18} />
            <span>子供を追加</span>
          </button>
        </div>
      ) : selectedDriverId && seatCount > 0 ? (
        // 配車: 座席数ベース（追加可能な場合のみボタン表示、満席バナーは引率者セクション下に表示）
        <div className="mt-3">
          {canAddAssignment && (
            <button
              type="button"
              onClick={() => append({ childId: 0 })}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
            >
              <Plus size={18} />
              <span>あと{seatCount - fields.length - escortCount}人乗車できます</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
