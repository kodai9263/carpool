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
  existingDriverAvailabilities: Map<number, { seats: number; availability: boolean; comment: string | null }>;
  existingEscortAvailabilities: Map<number, { availability: boolean; comment: string | null }>;
  register: UseFormRegister<AvailabilityListFormValues>;
  control: Control<AvailabilityListFormValues>;
  canRemove: boolean;
}

export default function AvailabilityFormItem({
  index,
  guardians,
  registeredGuardianIds,
  selectedGuardianIds,
  existingDriverAvailabilities,
  existingEscortAvailabilities,
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

  const driverAvailability = useWatch({
    control,
    name: `availabilities.${index}.driverAvailability`,
  });

  const escortAvailability = useWatch({
    control,
    name: `availabilities.${index}.escortAvailability`,
  });

  const guardianId = useWatch({
    control,
    name: `availabilities.${index}.guardianId`,
  });

  // 保護者が選択されたら、既存のデータを反映（配車・引率それぞれ）
  useEffect(() => {
    if (guardianId && guardianId !== 0) {
      const existingDriverData = existingDriverAvailabilities.get(guardianId);
      const existingEscortData = existingEscortAvailabilities.get(guardianId);

      if (existingDriverData) {
        setValue(`availabilities.${index}.driverAvailability`, existingDriverData.availability);
        setValue(`availabilities.${index}.seats`, existingDriverData.seats);
        setValue(`availabilities.${index}.driverComment`, existingDriverData.comment || "");
      } else {
        setValue(`availabilities.${index}.driverAvailability`, false);
        setValue(`availabilities.${index}.seats`, 1);
        setValue(`availabilities.${index}.driverComment`, "");
      }

      if (existingEscortData) {
        setValue(`availabilities.${index}.escortAvailability`, existingEscortData.availability);
        setValue(`availabilities.${index}.escortComment`, existingEscortData.comment || "");
      } else {
        setValue(`availabilities.${index}.escortAvailability`, false);
        setValue(`availabilities.${index}.escortComment`, "");
      }
    } else {
      // 「選択してください」に戻した場合はリセット
      setValue(`availabilities.${index}.driverAvailability`, false);
      setValue(`availabilities.${index}.seats`, 1);
      setValue(`availabilities.${index}.driverComment`, "");
      setValue(`availabilities.${index}.escortAvailability`, false);
      setValue(`availabilities.${index}.escortComment`, "");
    }
  }, [guardianId, existingDriverAvailabilities, existingEscortAvailabilities, index, setValue]);

  // 保護者が選ばれているか
  const isGuardianSelected = guardianId && guardianId !== 0;

  // 既存の登録情報を取得
  const existingDriverData =
    guardianId && guardianId !== 0 ? existingDriverAvailabilities.get(guardianId) : undefined;
  const existingEscortData =
    guardianId && guardianId !== 0 ? existingEscortAvailabilities.get(guardianId) : undefined;

  const isChangingDriverToUnavailable = existingDriverData?.availability && !driverAvailability;
  const isChangingEscortToUnavailable = existingEscortData?.availability && !escortAvailability;

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

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition flex-shrink-0 p-2 -m-2 self-center"
            aria-label="削除"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* エラーメッセージ */}
      {guardianIdError && (
        <div className="text-sm text-red-500 text-center">
          <p>{guardianIdError.message}</p>
        </div>
      )}

      {/* 配車セクション */}
      <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-white">
        <label
          className={`flex items-center gap-2 whitespace-nowrap min-h-[44px] ${
            isGuardianSelected
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          <input
            type="checkbox"
            {...register(`availabilities.${index}.driverAvailability`)}
            disabled={!isGuardianSelected}
            className="w-6 h-6 text-teal-700 rounded focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed"
          />
          <span className="text-base font-medium">🚗 配車可</span>
        </label>

        {driverAvailability && (
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

            <div className="flex flex-col gap-1">
              <span className="text-sm md:text-base font-bold">コメント</span>
              <input
                type="text"
                {...register(`availabilities.${index}.driverComment`)}
                placeholder="例: 兄弟2人も同乗、行きのみ可など"
                className="border-2 border-gray-300 rounded px-3 py-2 w-full text-base focus:border-teal-700 focus:ring-2 focus:ring-teal-700 focus:outline-none"
              />
            </div>
          </>
        )}

        {isChangingDriverToUnavailable && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded border border-orange-200">
            <span>⚠️</span>
            <span>この登録を「配車不可」に変更します</span>
          </div>
        )}
      </div>

      {/* 引率セクション */}
      <div className="border border-gray-200 rounded-md p-3 space-y-3 bg-white">
        <label
          className={`flex items-center gap-2 whitespace-nowrap min-h-[44px] ${
            isGuardianSelected
              ? "cursor-pointer"
              : "cursor-not-allowed opacity-50"
          }`}
        >
          <input
            type="checkbox"
            {...register(`availabilities.${index}.escortAvailability`)}
            disabled={!isGuardianSelected}
            className="w-6 h-6 text-teal-700 rounded focus:ring-2 focus:ring-teal-500 disabled:cursor-not-allowed"
          />
          <span className="text-base font-medium">🚶 引率可</span>
        </label>

        {escortAvailability && (
          <div className="flex flex-col gap-1">
            <span className="text-sm md:text-base font-bold">コメント</span>
            <input
              type="text"
              {...register(`availabilities.${index}.escortComment`)}
              placeholder="例: 午前中のみ可など"
              className="border-2 border-gray-300 rounded px-3 py-2 w-full text-base focus:border-teal-700 focus:ring-2 focus:ring-teal-700 focus:outline-none"
            />
          </div>
        )}

        {isChangingEscortToUnavailable && (
          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded border border-orange-200">
            <span>⚠️</span>
            <span>この登録を「引率不可」に変更します</span>
          </div>
        )}
      </div>
    </div>
  );
}
