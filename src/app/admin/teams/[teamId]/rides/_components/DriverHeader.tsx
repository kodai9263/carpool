'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { CarFront, X } from "lucide-react";
import { UseFormRegister } from "react-hook-form";

interface Props {
  index: number;
  register: UseFormRegister<UpdateRideValues>;
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
  }[];
  onRemove: () => void;
};

export default function DriverHeader({
  index,
  register,
  availabilityDrivers,
  onRemove,
}: Props) {
  
  return (
    <div className="">
      {/* 配車号削除ボタン */}
      <button
        type="button"
        onClick={onRemove}
        className=""
      >
        <X size={20} />
      </button>

      {/* 配車号 */}
      <div className="">
        <CarFront size={22} />
        <select 
          {...register(`drivers.${index}.availabilityDriverId`, {
            required: true,
            valueAsNumber: true,
          })}
          className=""
        >
          <option value="">選択</option>
          {availabilityDrivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.member.name}号
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}