'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { useExcludeIds } from "@/app/admin/_hooks/useExcludeIds";
import { useSyncRowsWithSeats } from "@/app/admin/_hooks/useSyncRowsWithSeats";
import { Plus, User, X } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

interface Props {
  index: number;
  childrenList: { id: number; name: string }[];
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
    seats: number;
    availability: boolean;
  }[];
};

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
  const drivers = useWatch({ control, name: "drivers"}) ?? [];
  const driver = drivers[index];
  const currentAssignments = driver?.rideAssignments ?? [];
  const selectedDriverId = driver?.availabilityDriverId ?? null;

  const selfSelectedChildIds = useMemo(() => {
    const ids = currentAssignments 
      .map((item) => item.childId)
      .filter((childId): childId is number => !! childId);
    return new Set(ids);
  }, [currentAssignments]);

  // 選択されたドライバーの座席数を取得
  const selectedDriverSeats = availabilityDrivers.find((d) => d.id === selectedDriverId);
  const seatCount = selectedDriverSeats?.seats ?? 0;

  // ドライバー選択時に座席数分の行を自動追加
  useSyncRowsWithSeats(selectedDriverId, seatCount, fields.length, append, remove, replace, currentAssignments);

  // 乗車する子どもの数を増やせるかどうかの判定
  const canAddAssignment = fields.length < seatCount;

  // 他ドライバーが選んだchildIdの重複防止
  const excluded = useExcludeIds(drivers, index, ["rideAssignments"]);

  return (
    <div className="space-y-2">      
      {fields.map((item, childIndex) => {
        const currentChildId = currentAssignments[childIndex]?.childId ?? 0;

        return (
          <div key={item.id} className="flex items-center bg-white p-2 rounded border border-gray-200">
            <User size={18} className="text-gray-600 mr-1"/>

            <select 
              {...register(`drivers.${index}.rideAssignments.${childIndex}.childId`,
                { valueAsNumber: true }
              )}
              className="border rounded px-2 py-1 text-sm flex-1 w-full"
            >
              <option value={0}></option>

              {childrenList.map((child) => {
                // 他ドライバーが選んだら無効化、同一ドライバー内で既に選択していたら無効化 
                const isDisabled =
                  excluded.has(child.id) && !selfSelectedChildIds.has(child.id) ||
                  (selfSelectedChildIds.has(child.id) && child.id !== currentChildId);

                return (
                  <option 
                    key={child.id}
                    value={child.id}
                    disabled={isDisabled}
                    className={isDisabled ? "text-gray-400 bg-gray-100" : ""}
                  >
                    {child.name}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              onClick={() => remove(childIndex)}
              className="text-gray-500 hover:text-red-600 transition ml-2"
            >
              <X size={20} />
            </button>
          </div>
        );
      })}

      {selectedDriverId && seatCount > 0 ? (
        <div className="mt-1">
          {canAddAssignment ? (
            <button
              type="button"
              onClick={() => append({ childId: 0 })}
              className="flex items-center text-blue-600 hover:text-blue-700 transition mt-1"
            >
              <Plus size={20} />
              <span className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-sm text-blue-700">
                あと{seatCount - fields.length}人乗車できます
              </span>
            </button>
          ) : (
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm text-yellow-700">
              {seatCount}人まで乗車可能です
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
