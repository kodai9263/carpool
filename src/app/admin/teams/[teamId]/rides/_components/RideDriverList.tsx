'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { useMemo, useState } from "react";
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
  childAvailabilities: { childId: number; availability: boolean; selfDriving: boolean }[];
  removeDriver: (index: number) => void;
  appendDriver: (direction: "outbound" | "inbound") => void;
  onDriverAdded?: () => void;
  onDriverSelected?: () => void;
};

export default function RideDriverList({
  drivers,
  separateDirections,
  availabilityDrivers,
  childrenList,
  childAvailabilities,
  removeDriver,
  appendDriver,
  onDriverAdded,
  onDriverSelected,
}: Props) {
  const { control } = useFormContext<UpdateRideValues>();
  const [focusedDriverIndex, setFocusedDriverIndex] = useState<number | null>(null);

  // フォームの現在の drivers 状態を監視
  const watchedDrivers = useWatch({ control, name: "drivers" });
  const formDrivers = useMemo(() => watchedDrivers ?? [], [watchedDrivers]);

  // 行き・帰りのドライバー候補数・インデックスをメモ化（formDriversかavailabilityDriversが変わった時だけ再計算）
  const { outboundCandidates, inboundCandidates, outboundIndices, inboundIndices } = useMemo(() => ({
    outboundCandidates: availabilityDrivers.filter(
      d => d.availability === true && d.type === 'driver' && (d.direction === 'outbound' || d.direction === 'both')
    ),
    inboundCandidates: availabilityDrivers.filter(
      d => d.availability === true && d.type === 'driver' && (d.direction === 'inbound' || d.direction === 'both')
    ),
    outboundIndices: formDrivers
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => (d?.direction ?? 'outbound') === 'outbound')
      .map(({ i }) => i),
    inboundIndices: formDrivers
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d?.direction === 'inbound')
      .map(({ i }) => i),
  }), [formDrivers, availabilityDrivers]);

  const renderSection = (
    label: string,
    indices: number[],
    candidates: typeof outboundCandidates,
    direction: "outbound" | "inbound",
    guideTarget?: string,
  ) => (
    <div className="space-y-4">
      <h3 className="border-b border-gray-200 pb-2 text-base font-bold text-gray-700">
        {label}
      </h3>
      <div className="flex flex-col items-center space-y-6">
        <div className="grid w-full max-w-[920px] grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {indices.map((i) => {
            const field = drivers[i];
            if (!field) return null;
            const isFocusedDriver = i === (focusedDriverIndex ?? indices[0]);
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
                driverSelectGuideTarget={isFocusedDriver ? "admin-ride-driver-select" : undefined}
                assignmentGuideTarget={isFocusedDriver ? "admin-ride-driver-assignments" : undefined}
                onDriverSelected={() => {
                  setFocusedDriverIndex(i);
                  onDriverSelected?.();
                }}
              />
            );
          })}
        </div>

        <div className="mt-2" data-guide={guideTarget}>
          {indices.length < candidates.length ? (
            <button
              type="button"
              onClick={() => {
                const nextDriverIndex = drivers.length;
                appendDriver(direction);
                setFocusedDriverIndex(nextDriverIndex);
                requestAnimationFrame(() => {
                  (document.activeElement as HTMLElement)?.blur();
                  onDriverAdded?.();
                });
              }}
              className="app-button-primary"
            >
              <Plus size={20} />
              <span>ドライバー追加</span>
            </button>
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3 text-center text-xs font-medium text-yellow-700">
              {candidates.length === 0
                ? "候補のドライバーがいません"
                : `候補のドライバーがいません（${candidates.length}人まで配車可能）`}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 行き帰り共通モード用：両方対応可能なドライバー候補・インデックスをメモ化
  const { allDriverCandidates, allDriverIndices } = useMemo(() => ({
    allDriverCandidates: availabilityDrivers.filter(
      d => d.availability === true && d.type === 'driver' && d.direction === 'both'
    ),
    allDriverIndices: formDrivers
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d !== undefined)
      .map(({ i }) => i),
  }), [formDrivers, availabilityDrivers]);

  return (
    <div className="space-y-8">
      {separateDirections ? (
        <>
          {renderSection("行き配車", outboundIndices, outboundCandidates, "outbound", "admin-ride-manual-assign")}
          {renderSection("帰り配車", inboundIndices, inboundCandidates, "inbound")}
        </>
      ) : (
        renderSection("配車", allDriverIndices, allDriverCandidates, "outbound", "admin-ride-manual-assign")
      )}
    </div>
  );
}
