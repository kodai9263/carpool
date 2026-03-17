'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { FieldArrayWithId, useFormContext, useWatch } from "react-hook-form";
import RideDriverItem from "./RideDriverItem";
import { Plus } from "lucide-react";

interface Props {
  drivers: FieldArrayWithId<UpdateRideValues, 'drivers', 'id'>[];
  separateDirections: boolean;
  availabilityDrivers: {
    id: number;
    type: string;
    direction: string;
    guardian: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
  childrenList: { id: number; name: string; currentGrade: number | null }[];
  childAvailabilities: { childId: number; availability: boolean }[];
  removeDriver: (index: number) => void;
  appendDriver: (direction: "outbound" | "inbound") => void;
};

export default function RideDriverList({
  drivers,
  separateDirections,
  availabilityDrivers,
  childrenList,
  childAvailabilities,
  removeDriver,
  appendDriver,
}: Props) {
  const { control } = useFormContext<UpdateRideValues>();

  // フォームの現在の drivers 状態を監視
  const formDrivers = useWatch({ control, name: "drivers" }) ?? [];

  // 行き・帰りのドライバー候補数
  const outboundCandidates = availabilityDrivers.filter(
    d => d.availability === true && d.type === 'driver' && (d.direction === 'outbound' || d.direction === 'both')
  );
  const inboundCandidates = availabilityDrivers.filter(
    d => d.availability === true && d.type === 'driver' && (d.direction === 'inbound' || d.direction === 'both')
  );

  // フォーム内ドライバーを行き・帰りで分類
  const outboundIndices = formDrivers
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => (d?.direction ?? 'outbound') === 'outbound')
    .map(({ i }) => i);

  const inboundIndices = formDrivers
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d?.direction === 'inbound')
    .map(({ i }) => i);

  const renderSection = (
    label: string,
    indices: number[],
    candidates: typeof outboundCandidates,
    direction: "outbound" | "inbound"
  ) => (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-700 border-b border-gray-200 pb-2">
        {label}
      </h3>
      <div className="flex flex-col items-center space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
          {indices.map((i) => {
            const field = drivers[i];
            if (!field) return null;
            return (
              <RideDriverItem
                key={field.id}
                index={i}
                direction={direction}
                separateDirections={separateDirections}
                availabilityDrivers={availabilityDrivers}
                childrenList={childrenList}
                childAvailabilities={childAvailabilities}
                removeDriver={removeDriver}
              />
            );
          })}
        </div>

        <div className="mt-2">
          {indices.length < candidates.length ? (
            <button
              type="button"
              onClick={() => {
                appendDriver(direction);
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
              {candidates.length === 0
                ? "候補のドライバーがいません"
                : `候補のドライバーがいません（${candidates.length}人まで配車可能）`}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 行き帰り共通モード用：両方対応可能なドライバー候補のみ
  const allDriverCandidates = availabilityDrivers.filter(
    d => d.availability === true && d.type === 'driver' && d.direction === 'both'
  );
  const allDriverIndices = formDrivers
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d !== undefined)
    .map(({ i }) => i);

  return (
    <div className="space-y-8">
      {separateDirections ? (
        <>
          {renderSection("🚗 行き配車", outboundIndices, outboundCandidates, "outbound")}
          {renderSection("🚗 帰り配車", inboundIndices, inboundCandidates, "inbound")}
        </>
      ) : (
        renderSection("🚗 配車", allDriverIndices, allDriverCandidates, "outbound")
      )}
    </div>
  );
}
