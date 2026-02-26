"use client";

import { AvailabilityListFormValues } from "@/app/_types/availability";
import { User, X } from "lucide-react";
import { useEffect } from "react";
import { Control, useFormContext, UseFormRegister, useWatch } from "react-hook-form";

interface Props {
  index: number;
  guardians: Array<{ id: number; name: string }>;
  registeredGuardianIds: Set<number>;
  selectedGuardianIds: Set<number>;
  onRemove: () => void;
  existingAvailabilities: Map<number, { seats: number; availability: boolean; comment: string | null }>;
  register: UseFormRegister<AvailabilityListFormValues>;
  control: Control<AvailabilityListFormValues>;
  canRemove: boolean;
}

export default function AvailabilityFormItem({
  index,
  guardians,
  registeredGuardianIds,
  selectedGuardianIds,
  existingAvailabilities,
  onRemove,
  register,
  control,
  canRemove,
}: Props) {
  const {
    setValue,
    formState: { errors },
  } = useFormContext<AvailabilityListFormValues>();

  // エラー取得
  const guardianIdError = errors.availabilities?.[index]?.guardianId;
  const availabilityError = errors.availabilities?.[index]?.availability;

  const availability = useWatch({
    control,
    name: `availabilities.${index}.availability`,
  });

  const guardianId = useWatch({
    control,
    name: `availabilities.${index}.guardianId`,
  });

  // 保護者が選択されたら、既存のデータを反映（乗車可能人数など）
  useEffect(() => {
    if (guardianId && guardianId !== 0) {
      const existingData = existingAvailabilities.get(guardianId);
      if (existingData) {
        // 既存データがあれば設定
        setValue(
          `availabilities.${index}.availability`,
          existingData.availability
        );
        setValue(`availabilities.${index}.seats`, existingData.seats);
        setValue(`availabilities.${index}.comment`, existingData.comment || "");
      } else {
        // 既存データがなければデフォルト値
        setValue(`availabilities.${index}.availability`, false);
        setValue(`availabilities.${index}.seats`, 1);
        setValue(`availabilities.${index}.comment`, "");
      }
    } else {
      // 「選択してください」に戻した場合はリセット
      setValue(`availabilities.${index}.availability`, false);
      setValue(`availabilities.${index}.seats`, 1);
      setValue(`availabilities.${index}.comment`, "");
    }
  }, [guardianId, existingAvailabilities, index, setValue]);

  // 保護者が選ばれているか
  const isGuardianSelected = guardianId && guardianId !== 0;

  // 既存の登録情報を取得
  const existingData =
    guardianId && guardianId !== 0
      ? existingAvailabilities.get(guardianId)
      : undefined;
  const isChangingToUnavailable = existingData?.availability && !availability;

  return (
    <div className="p-3 md:p-4 border rounded-lg bg-gray-50 space-y-3">
      {/* 保護者名 */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2">
          <User size={20} className="text-gray-600 flex-shrink-0" />
          <span className="text-sm md:text-base font-bold flex-shrink-0">
            保護者名
          </span>
        </div>
        <select
          {...register(`availabilities.${index}.guardianId`, {
            required: true,
            valueAsNumber: true,
          })}
          className={`w-full md:flex-1 border-2 rounded px-3 py-2 text-base focus:ring-2 focus:outline-none ${
            guardianIdError
              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-teal-700 focus:ring-teal-700"
          }`}
        >
          <option value={0}>選択してください</option>
          {guardians.map((guardian) => {
            // 既に他のフォームで選択されているか
            const isSelectedElsewhere =
              selectedGuardianIds.has(guardian.id) && guardian.id !== guardianId;

            return (
              <option
                key={guardian.id}
                value={guardian.id}
                disabled={isSelectedElsewhere}
                className={
                  isSelectedElsewhere ? "text-gray-400 bg-gray-100" : ""
                }
              >
                {guardian.name}
                {registeredGuardianIds.has(guardian.id) && " (登録済み)"}
              </option>
            );
          })}
        </select>
      </div>

      {/* 配車可チェックボックス */}
      <div className="flex items-center justify-between">
        <label
          className={`flex items-center gap-2 whitespace-nowrap min-h-[44px] ${
            isGuardianSelected
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          <input
            type="checkbox"
            {...register(`availabilities.${index}.availability`)}
            disabled={!isGuardianSelected}
            className="w-6 h-6 text-teal-700 rounded focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed"
          />
          <span className="text-base">配車可</span>
        </label>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition flex-shrink-0 p-2 -m-2"
            aria-label="削除"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* エラーメッセージ */}
      {guardianIdError ? (
        <div className="text-sm text-red-500 text-center">
          <p>{guardianIdError.message}</p>
        </div>
      ) : (
        availabilityError && (
          <div className="text-sm text-red-500 text-center">
            <p>{availabilityError.message}</p>
          </div>
        )
      )}

      {/* 配車可能人数（配車可の場合のみ表示） */}
      {availability && (
        <>
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <span className="text-sm md:text-base font-bold">乗車人数</span>
            <select
              {...register(`availabilities.${index}.seats`, {
                valueAsNumber: true,
              })}
              className="border-2 border-gray-300 rounded px-3 py-2 w-full md:w-32 text-base focus:border-teal-700 focus:ring-2 focus:ring-teal-700 focus:outline-none"
            >
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}人
                </option>
              ))}
            </select>
          </div>

          {/* コメント */}
          <div className="flex flex-col gap-1">
            <span className="text-sm md:text-base font-bold">コメント</span>
            <input
              type="text"
              {...register(`availabilities.${index}.comment`)}
              placeholder="例: 兄弟2人も同乗、行きのみ可など"
              className="border-2 border-gray-300 rounded px-3 py-2 w-full text-base focus:border-teal-700 focus:ring-2 focus:ring-teal-700 focus:outline-none"
            />
          </div>
        </>
      )}

      {isChangingToUnavailable && (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded border border-orange-200">
          <span>⚠️</span>
          <span>この登録を「配車不可」に変更します</span>
        </div>
      )}
    </div>
  );
}
