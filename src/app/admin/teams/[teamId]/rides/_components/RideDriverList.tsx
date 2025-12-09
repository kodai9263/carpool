'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { FieldArrayWithId, useFormContext, UseFormRegister } from "react-hook-form";
import RideDriverItem from "./RideDriverItem";
import { Plus } from "lucide-react";

interface Props {
  drivers: FieldArrayWithId<UpdateRideValues, 'drivers', 'id'>[];
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
    seats: number;
  }[];
  childrenList: { id: number; name: string }[];
  removeDriver: (index: number) => void;
  appendDriver: () => void;
};

export default function RideDriverList({
  drivers,
  availabilityDrivers,
  childrenList,
  removeDriver,
  appendDriver,
}: Props) {
  const { control, register } = useFormContext<UpdateRideValues>();

  // 選択できるドライバーの合計数
  const totalAvailableDrivers = availabilityDrivers.length;

  // 現在フォーム上に存在するドライバー行数(選択済みかは関係なし)
  const currentDriverCount = drivers.length;

  // 行数が追加可能かどうか
  const isDriverSlotAvailable =  currentDriverCount < totalAvailableDrivers;

  const sharedItemProps = {
    control,
    register,
    availabilityDrivers,
    childrenList,
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {drivers.map((driver, index) => (
          <RideDriverItem 
            key={driver.id}
            index={index} 
            {...sharedItemProps}
            removeDriver={removeDriver}
          />
        ))}
      </div>

      <div className="mt-1">
        {isDriverSlotAvailable ? (
          <button
        type="button"
        onClick={appendDriver}
        className="flex items-center"
      >
        <Plus size={20} />
        <span className="ml-2">ドライバー追加</span>
      </button>
        ) : (
          <div className="text-center bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm text-yellow-700">
          {totalAvailableDrivers == 0 ? "候補のドライバーがいません" : `候補のドライバーがいません（${totalAvailableDrivers}人まで配車可能）`}
        </div>
        )}
      </div>
    </div>
  );
}