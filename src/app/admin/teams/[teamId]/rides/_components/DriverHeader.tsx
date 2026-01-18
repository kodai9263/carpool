"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { useExcludeIds } from "@/app/admin/_hooks/useExcludeIds";
import { CarFront, X } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

interface Props {
  index: number;
  availabilityDrivers: {
    id: number;
    availability: boolean;
    member: { id: number; name: string };
  }[];
  onRemove: () => void;
}

export default function DriverHeader({
  index,
  availabilityDrivers,
  onRemove,
}: Props) {
  const { control, register } = useFormContext<UpdateRideValues>();

  const watchedDrivers = useWatch({ control, name: "drivers" });

  const excluded = useExcludeIds(watchedDrivers, index, [
    "availabilityDriverId",
  ]);

  // 配車可能（availability: true）のドライバーのみを表示
  const availableDrivers = availabilityDrivers.filter(
    (driver) => driver.availability === true
  );

  if (!excluded) return null;

  return (
    <div>
      {/* 削除ボタンとドライバー選択を横並び */}
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CarFront size={24} className="text-[#5d9b94] flex-shrink-0" />
          <select
            {...register(`drivers.${index}.availabilityDriverId`, {
              required: true,
              valueAsNumber: true,
            })}
            className="w-full min-w-0 truncate border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#5d9b94] focus:ring-2 focus:ring-[#5d9b94] focus:outline-none"
          >
            <option value={0}>ドライバーを選択</option>
            {availableDrivers.map((driver) => {
              const isDisabled = excluded.has(driver.id);

              return (
                <option
                  key={driver.id}
                  value={driver.id}
                  disabled={isDisabled}
                  className={isDisabled ? "text-gray-400 bg-gray-100" : ""}
                >
                  {driver.member.name}号
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition flex-shrink-0 mt-1"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
