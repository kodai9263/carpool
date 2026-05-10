"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { MessageSquare, PersonStanding, X } from "lucide-react";
import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

interface Props {
  driverIndex: number;
  escortIndex: number;
  direction: "outbound" | "inbound";
  availabilityDrivers: {
    id: number;
    type: string;
    direction: string;
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
  direction,
  availabilityDrivers,
  onRemove,
}: Props) {
  const { register } = useFormContext<UpdateRideValues>();

  // 選択中の引率者IDを監視してコメント取得
  const selectedEscortId = useWatch({ name: `drivers.${driverIndex}.escorts.${escortIndex}.availabilityDriverId` });
  const selectedEscort = availabilityDrivers.find((d) => d.id === Number(selectedEscortId));
  const comment = selectedEscort?.comment;

  // 全ドライバーの状態を監視
  const watchedDrivers = useWatch({ name: "drivers" });
  const allDrivers = useMemo(() => watchedDrivers ?? [], [watchedDrivers]);

  // 引率者候補（availability: true かつ type: 'escort' かつ対応方向）
  const availableEscorts = useMemo(() =>
    availabilityDrivers.filter(
      d => d.availability === true && d.type === 'escort' && (d.direction === direction || d.direction === 'both')
    ),
    [availabilityDrivers, direction]
  );

  // 選択済みの引率者IDを収集（同方向の他の引率者枠 + 配車ドライバーと同一人物の引率IDも除外）
  const excludedEscortIds = useMemo(() => {
    const set = new Set<number>();

    allDrivers.forEach((d: { availabilityDriverId?: number; direction?: string; escorts?: { availabilityDriverId?: number }[] }, di: number) => {
      const dDirection = d?.direction ?? 'outbound';

      // 同じ方向のドライバーカードの引率者枠で選択済みのIDを除外
      if (dDirection === direction) {
        (d?.escorts ?? []).forEach((e: { availabilityDriverId?: number }, ei: number) => {
          if (di === driverIndex && ei === escortIndex) return;
          const id = e?.availabilityDriverId;
          if (id && id !== 0) set.add(id);
        });

        // 同方向の配車ドライバーとして選ばれている人と同一guardianのescortIDを除外
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
      }
    });

    return set;
  }, [allDrivers, driverIndex, escortIndex, direction, availabilityDrivers]);

  return (
    <div className="rounded-lg border border-teal-200 bg-white p-3">
      {/* 引率者選択 */}
      <div className="flex items-center gap-2">
        <PersonStanding size={18} className="flex-shrink-0 text-teal-700" />
        <select
          {...register(`drivers.${driverIndex}.escorts.${escortIndex}.availabilityDriverId`, {
            valueAsNumber: true,
          })}
          className="app-select w-full min-w-0 truncate py-2 text-sm"
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
          className="flex-shrink-0 text-gray-400 transition hover:text-red-500"
        >
          <X size={16} />
        </button>
      </div>
      {/* 引率者のコメント */}
      {comment && (
        <div className="ml-7 mr-6 mt-2 flex items-start gap-1.5 rounded border border-orange-200 bg-orange-100 px-2 py-1.5 text-xs text-orange-700">
          <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
          <span>{comment}</span>
        </div>
      )}
    </div>
  );
}
