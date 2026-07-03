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
    direction: string;
    availability: boolean;
    comment: string | null;
    guardian: { id: number; name: string };
  }[];
  type: string;
  direction: "outbound" | "inbound";
  separateDirections: boolean;
  onRemove: () => void;
  guideTarget?: string;
  onDriverSelected?: () => void;
}

export default function DriverHeader({
  index,
  availabilityDrivers,
  type,
  direction,
  separateDirections,
  onRemove,
  guideTarget,
  onDriverSelected,
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
    const selectedValue = Number(e.target.value);
    // react-hook-formのonChangeを先に実行
    onChange(e);
    // フォーカスを一旦外してから戻すことで、子供のセレクトが開くのを防ぐ
    selectRef.current?.blur();
    requestAnimationFrame(() => {
      selectRef.current?.scrollIntoView({ block: "nearest", behavior: "instant" });
      if (selectedValue > 0) {
        onDriverSelected?.();
      }
    });
  };

  const watchedDrivers = useWatch({ control, name: "drivers" });

  // 同じ方向のドライバーのみを対象に重複チェック（行きと帰りで同一人物を選べるように）
  const currentDriver = watchedDrivers?.[index];
  const sameDirectionDrivers = (watchedDrivers ?? []).filter(
    (d) => (d?.direction ?? 'outbound') === direction
  );
  const sameDirectionIndex = sameDirectionDrivers.findIndex((d) => d === currentDriver);
  const excluded = useExcludeIds(
    sameDirectionDrivers,
    sameDirectionIndex >= 0 ? sameDirectionIndex : 0,
    ["availabilityDriverId"]
  );

  // 配車可能（availability: true）かつ対応方向のドライバーのみを表示
  // 行き帰り共通モード（separateDirections=false）の場合は both のみ表示
  const availableDrivers = availabilityDrivers.filter(
    (driver) =>
      driver.availability === true &&
      driver.type === type &&
      (separateDirections
        ? driver.direction === direction || driver.direction === 'both'
        : driver.direction === 'both')
  );

  const selectedDriverId = useWatch({ control, name: `drivers.${index}.availabilityDriverId` });
  const selectedDriver = availabilityDrivers.find((d) => d.id === Number(selectedDriverId));
  const comment = selectedDriver?.comment;

  if (!excluded) return null;

  return (
    <div className="space-y-1" data-guide={guideTarget}>
      {/* 削除ボタンとドライバー選択を横並び */}
      <div className="flex items-start gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CarFront size={24} className="flex-shrink-0 text-teal-700" />
          <select
            name={name}
            onBlur={onBlur}
            onChange={handleDriverChange}
            ref={(e) => {
              ref(e);
              (selectRef as React.MutableRefObject<HTMLSelectElement | null>).current = e;
            }}
            className="app-select w-full min-w-0 truncate py-2 text-sm"
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
          className="mt-1 flex-shrink-0 text-gray-400 transition hover:text-red-500"
        >
          <X size={20} />
        </button>
      </div>

      {/* ドライバーのコメント表示 */}
      {comment && (
        <div className="ml-8 mr-7 flex items-start gap-1.5 rounded border border-orange-200 bg-orange-100 px-2 py-1.5 text-xs text-orange-700">
          <MessageSquare size={14} className="flex-shrink-0 mt-0.5" />
          <span>{comment}</span>
        </div>
      )}
    </div>
  );
}
