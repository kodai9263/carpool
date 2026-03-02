"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { Plus } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import EscortItem from "./EscortItem";
import { useMemo } from "react";

interface Props {
  driverIndex: number;
  availabilityDrivers: {
    id: number;
    type: string;
    guardian: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
}

export default function EscortSection({
  driverIndex,
  availabilityDrivers,
}: Props) {
  const { control } = useFormContext<UpdateRideValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `drivers.${driverIndex}.escorts`,
  });

  // 全ドライバーを監視（追加ボタンの制御のため）
  const allDrivers = useWatch({ control, name: "drivers" }) ?? [];

  // 引率者候補（availability: true かつ type: 'escort'）の総数
  const totalAvailableEscorts = useMemo(() =>
    availabilityDrivers.filter(d => d.availability === true && d.type === 'escort').length,
    [availabilityDrivers]
  );

  // 全ドライバーカードで選択済みの引率者数（上限チェック用）
  const totalSelectedEscorts = useMemo(() =>
    allDrivers.reduce((count, d) =>
      count + (d?.escorts ?? []).filter(e => e?.availabilityDriverId && e.availabilityDriverId !== 0).length,
      0
    ),
    [allDrivers]
  );

  const canAddEscort = totalSelectedEscorts < totalAvailableEscorts;

  return (
    <div className="pt-3 border-t border-gray-200 space-y-2">
      <p className="text-xs font-medium text-gray-500">🚶 引率者</p>

      {fields.map((field, ei) => (
        <EscortItem
          key={field.id}
          driverIndex={driverIndex}
          escortIndex={ei}
          availabilityDrivers={availabilityDrivers}
          onRemove={() => remove(ei)}
        />
      ))}

      {canAddEscort && (
        <button
          type="button"
          onClick={() => append({ availabilityDriverId: 0, rideAssignments: [] })}
          className="w-full flex items-center justify-center gap-1.5 text-[#5d9b94] hover:text-[#4a7d77] transition bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs font-medium"
        >
          <Plus size={14} />
          <span>引率者を追加</span>
        </button>
      )}
    </div>
  );
}
