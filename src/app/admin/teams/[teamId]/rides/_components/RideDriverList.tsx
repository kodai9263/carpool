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
  appendDriver: (type: string) => void;
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

  // フォームの現在の drivers 状態を監視（type を取得するため）
  const formDrivers = useWatch({ control, name: "drivers" }) ?? [];

  // インデックスを保持しながら type でグループ化する
  // ※ useFieldArray の remove(index) は元配列のインデックスを使うため、
  //   フィルタリング後もオリジナルのインデックスを保持しなければならない
  const driverItems = drivers
    .map((field, i) => ({ field, index: i }))
    .filter(({ index: i }) => (formDrivers[i]?.type ?? 'driver') !== 'escort');

  const escortItems = drivers
    .map((field, i) => ({ field, index: i }))
    .filter(({ index: i }) => formDrivers[i]?.type === 'escort');

  // 配車ドライバーの候補数（availability: true かつ type: 'driver'）
  const totalAvailableDrivers = availabilityDrivers.filter(
    d => d.availability === true && d.type === 'driver'
  ).length;

  // 引率者の候補数
  const totalAvailableEscorts = availabilityDrivers.filter(
    d => d.availability === true && d.type === 'escort'
  ).length;

  const sharedItemProps = {
    availabilityDrivers,
    childrenList,
    childAvailabilities,
  };

  return (
    <div className="space-y-10">
      {/* 配車ドライバーセクション */}
      <div>
        <h3 className="text-lg font-bold mb-4">🚗 配車ドライバー</h3>
        <div className="flex flex-col items-center space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
            {driverItems.map(({ field, index }) => (
              <RideDriverItem
                key={field.id}
                index={index}
                type="driver"
                {...sharedItemProps}
                removeDriver={removeDriver}
              />
            ))}
          </div>

          <div className="mt-4">
            {driverItems.length < totalAvailableDrivers ? (
              <button
                type="button"
                onClick={() => {
                  appendDriver('driver');
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

      {/* 引率者セクション */}
      <div>
        <h3 className="text-lg font-bold mb-4">🚶 引率者</h3>
        <div className="flex flex-col items-center space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
            {escortItems.map(({ field, index }) => (
              <RideDriverItem
                key={field.id}
                index={index}
                type="escort"
                {...sharedItemProps}
                removeDriver={removeDriver}
              />
            ))}
          </div>

          <div className="mt-4">
            {escortItems.length < totalAvailableEscorts ? (
              <button
                type="button"
                onClick={() => {
                  appendDriver('escort');
                  requestAnimationFrame(() => {
                    (document.activeElement as HTMLElement)?.blur();
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#5d9b94] text-white rounded-lg hover:bg-[#4a7d77] transition font-medium"
              >
                <Plus size={20} />
                <span>引率者追加</span>
              </button>
            ) : (
              <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-3 text-xs text-yellow-700 font-medium">
                {totalAvailableEscorts === 0
                  ? "候補の引率者がいません"
                  : `候補の引率者がいません（${totalAvailableEscorts}人まで追加可能）`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
