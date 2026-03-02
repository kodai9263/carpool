'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { FieldArrayWithId, useFormContext, useWatch } from "react-hook-form";
import RideDriverItem from "./RideDriverItem";
import { Plus } from "lucide-react";

interface Props {
  drivers: FieldArrayWithId<UpdateRideValues, 'drivers', 'id'>[];
  availabilityDrivers: {
    id: number;
    type: string;
    guardian: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
  childrenList: { id: number; name: string; currentGrade: number | null }[];
  childAvailabilities: { childId: number; availability: boolean }[];
  removeDriver: (index: number) => void;
  appendDriver: () => void;
};

export default function RideDriverList({
  drivers,
  availabilityDrivers,
  childrenList,
  childAvailabilities,
  removeDriver,
  appendDriver,
}: Props) {
  const { control } = useFormContext<UpdateRideValues>();

  // フォームの現在の drivers 状態を監視
  const formDrivers = useWatch({ control, name: "drivers" }) ?? [];

  // 配車ドライバーの候補数（availability: true かつ type: 'driver'）
  const totalAvailableDrivers = availabilityDrivers.filter(
    d => d.availability === true && d.type === 'driver'
  ).length;

  // 現在追加済みのドライバー数
  const currentDriverCount = formDrivers.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
          {drivers.map((field, i) => (
            <RideDriverItem
              key={field.id}
              index={i}
              availabilityDrivers={availabilityDrivers}
              childrenList={childrenList}
              childAvailabilities={childAvailabilities}
              removeDriver={removeDriver}
            />
          ))}
        </div>

        <div className="mt-4">
          {currentDriverCount < totalAvailableDrivers ? (
            <button
              type="button"
              onClick={() => {
                appendDriver();
                requestAnimationFrame(() => {
                  (document.activeElement as HTMLElement)?.blur();
                });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#5d9b94] text-white rounded-lg hover:bg-[#4a7d77] transition font-medium"
            >
              <Plus size={20} />
              <span>ドライバー追加</span>
            </button>
          ) : (
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-3 text-xs text-yellow-700 font-medium">
              {totalAvailableDrivers === 0
                ? "候補のドライバーがいません"
                : `候補のドライバーがいません（${totalAvailableDrivers}人まで配車可能）`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
