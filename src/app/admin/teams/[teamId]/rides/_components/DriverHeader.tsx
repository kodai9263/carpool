'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { useExcludeIds } from "@/app/admin/_hooks/useExcludeIds"; 
import { CarFront, X } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

interface Props {
  index: number;
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
  }[];
  onRemove: () => void;
};

export default function DriverHeader({
  index,
  availabilityDrivers,
  onRemove,
}: Props) {
  const { control, register } = useFormContext<UpdateRideValues>();

  const watchedDrivers = useWatch({ control, name: "drivers"});

  const excluded = useExcludeIds(watchedDrivers, index, ["availabilityDriverId"]);
  
  return (
    <div className="flex items-center mb-2 gap-2">
      {/* 配車号削除ボタン */}
      <button
        type="button"
        onClick={onRemove}
        className="rounded text-gray-500 hover:text-red-600 transition"
      >
        <X size={20} />
      </button>

      {/* 配車号 */}
      <div className="flex items-center gap-2 flex-1">
        <CarFront size={22} className="text-gray-700"/>
        <select 
          {...register(`drivers.${index}.availabilityDriverId`, {
            required: true,
            valueAsNumber: true,
          })}
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 w-full"
        >
          <option value=""></option>
          {availabilityDrivers.map((driver) => {
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
    </div>
  );
}