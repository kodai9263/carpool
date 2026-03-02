"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { PersonStanding, X } from "lucide-react";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

interface Props {
  driverIndex: number;
  escortIndex: number;
  availabilityDrivers: {
    id: number;
    type: string;
    guardian: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
  onRemove: () => void;
}

export default function EscortItem({
  driverIndex,
  escortIndex,
  availabilityDrivers,
  onRemove,
}: Props) {
  const { register } = useFormContext<UpdateRideValues>();

  // 全ドライバーの状態を監視
  const allDrivers = useWatch({ name: "drivers" }) ?? [];

  // 引率者候補（availability: true かつ type: 'escort'）
  const availableEscorts = useMemo(() =>
    availabilityDrivers.filter(d => d.availability === true && d.type === 'escort'),
    [availabilityDrivers]
  );

  // 選択済みの引率者IDを収集（他の引率者枠 + 配車ドライバーと同一人物の引率IDも除外）
  const excludedEscortIds = useMemo(() => {
    const set = new Set<number>();

    allDrivers.forEach((d: { availabilityDriverId?: number; escorts?: { availabilityDriverId?: number }[] }, di: number) => {
      // 他の引率者枠で選択済みのIDを除外
      (d?.escorts ?? []).forEach((e: { availabilityDriverId?: number }, ei: number) => {
        if (di === driverIndex && ei === escortIndex) return;
        const id = e?.availabilityDriverId;
        if (id && id !== 0) set.add(id);
      });

      // 配車ドライバーとして選ばれている人と同一guardianのescortIDを除外
      const driverAvId = d?.availabilityDriverId;
      if (driverAvId && driverAvId !== 0) {
        const driverAv = availabilityDrivers.find(av => av.id === driverAvId);
        if (driverAv) {
          const escortAv = availabilityDrivers.find(
            av => av.guardian.id === driverAv.guardian.id && av.type === 'escort'
          );
          if (escortAv) set.add(escortAv.id);
        }
      }
    });

    return set;
  }, [allDrivers, driverIndex, escortIndex, availabilityDrivers]);

  return (
    <div className="bg-white border border-teal-200 rounded-lg p-3">
      {/* 引率者選択 */}
      <div className="flex items-center gap-2">
        <PersonStanding size={18} className="text-[#5d9b94] flex-shrink-0" />
        <select
          {...register(`drivers.${driverIndex}.escorts.${escortIndex}.availabilityDriverId`, {
            valueAsNumber: true,
          })}
          className="w-full min-w-0 truncate border-2 border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:border-[#5d9b94] focus:ring-2 focus:ring-[#5d9b94] focus:outline-none"
        >
          <option value={0}>引率者を選択</option>
          {availableEscorts.map((escort) => {
            const isDisabled = excludedEscortIds.has(escort.id);
            return (
              <option
                key={escort.id}
                value={escort.id}
                disabled={isDisabled}
                className={isDisabled ? "text-gray-400 bg-gray-100" : ""}
              >
                {escort.guardian.name}
              </option>
            );
          })}
        </select>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
