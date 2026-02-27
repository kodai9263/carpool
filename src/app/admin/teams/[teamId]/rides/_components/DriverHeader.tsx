"use client";

import { UpdateRideValues } from "@/app/_types/ride";
import { useExcludeIds } from "@/app/admin/_hooks/useExcludeIds";
import { CarFront, MessageSquare, X } from "lucide-react";
import { useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";

interface Props {
  index: number;
  availabilityDrivers: {
    id: number;
    type: string;
    availability: boolean;
    comment: string | null;
    guardian: { id: number; name: string };
  }[];
  type: string;
  onRemove: () => void;
}

export default function DriverHeader({
  index,
  availabilityDrivers,
  type,
  onRemove,
}: Props) {
  const { control, register } = useFormContext<UpdateRideValues>();
  const selectRef = useRef<HTMLSelectElement>(null);

  // registerを一度だけ呼び出す
  const { onChange, onBlur, name, ref } = register(`drivers.${index}.availabilityDriverId`, {
    required: true,
    valueAsNumber: true,
  });

  // スマホで保護者選択後に子供行が展開された際、
  // 1. スクロールが下に行かないようにする
  // 2. 子供のセレクトが自動で開かないようにフォーカスを保持する
  const handleDriverChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // react-hook-formのonChangeを先に実行
    onChange(e);
    // フォーカスを一旦外してから戻すことで、子供のセレクトが開くのを防ぐ
    selectRef.current?.blur();
    requestAnimationFrame(() => {
      selectRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
    });
  };

  const watchedDrivers = useWatch({ control, name: "drivers" });

  const excluded = useExcludeIds(watchedDrivers, index, [
    "availabilityDriverId",
  ]);

  // 配車可能（availability: true）のドライバーのみを表示
  const availableDrivers = availabilityDrivers.filter(
    (driver) => driver.availability === true && driver.type === type
  );

  const selectedDriverId = useWatch({ control, name: `drivers.${index}.availabilityDriverId` });
  const selectedDriver = availabilityDrivers.find((d) => d.id === Number(selectedDriverId));
  const comment = selectedDriver?.comment;

  if (!excluded) return null;

  return (
    <div className="space-y-1">
      {/* 削除ボタンとドライバー選択を横並び */}
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CarFront size={24} className="text-[#5d9b94] flex-shrink-0" />
          <select
            name={name}
            onBlur={onBlur}
            onChange={handleDriverChange}
            ref={(e) => {
              ref(e);
              (selectRef as React.MutableRefObject<HTMLSelectElement | null>).current = e;
            }}
            className="w-full min-w-0 truncate border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-[#5d9b94] focus:ring-2 focus:ring-[#5d9b94] focus:outline-none"
          >
            <option value={0}>ドライバーを選択</option>
            {availableDrivers.map((driver) => {
              const isDisabled = excluded.has(driver.id);

              return (
                <option
                  key={driver.id}
                  value={driver.id}
                  disabled={isDisabled}
                  className={isDisabled ? "text-gray-400 bg-gray-100" : ""}
                >
                  {driver.guardian.name}号
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition flex-shrink-0 mt-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* ドライバーのコメント表示 */}
      {comment && (
        <div className="flex items-start gap-1.5 ml-8 mr-7 text-xs text-orange-700 bg-orange-100 border border-orange-200 px-2 py-1.5 rounded">
          <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
          <span>{comment}</span>
        </div>
      )}
    </div>
  );
}
