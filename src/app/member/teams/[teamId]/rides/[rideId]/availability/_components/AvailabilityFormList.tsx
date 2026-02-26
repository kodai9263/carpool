"use client";

import { Plus } from "lucide-react";
import { Control, UseFormRegister, useFieldArray, useWatch } from "react-hook-form";
import AvailabilityFormItem from "./AvailabilityFormItem";
import { AvailabilityListFormValues } from "@/app/_types/availability";
import { useMemo } from "react";

interface Props {
  guardians: Array<{ id: number; name: string }>;
  registeredGuardianIds: Set<number>;
  existingAvailabilities: Map<number, { seats: number; availability: boolean; comment: string | null }>;
  register: UseFormRegister<AvailabilityListFormValues>;
  control: Control<AvailabilityListFormValues>;
}

export default function AvailabilityFormList({
  guardians,
  registeredGuardianIds,
  existingAvailabilities,
  register,
  control,
}: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "availabilities",
  });

  // 全フォームの選択状況を監視
  const availabilities = useWatch({
    control,
    name: "availabilities",
  });

  // すでに選択されている保護者IDのSetを作成
  const selectedGuardianIds = useMemo(() => {
    const ids = new Set<number>();
    availabilities.forEach((availability) => {
      if (availability.guardianId && availability.guardianId !== 0) {
        ids.add(availability.guardianId);
      }
    });
    return ids;
  }, [availabilities]);

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <AvailabilityFormItem
          key={field.id}
          index={index}
          guardians={guardians}
          registeredGuardianIds={registeredGuardianIds}
          existingAvailabilities={existingAvailabilities}
          selectedGuardianIds={selectedGuardianIds}
          onRemove={() => remove(index)}
          register={register}
          control={control}
          canRemove={fields.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={() => append({ guardianId: 0, availability: false, seats: 1, comment: "" })}
        className="flex items-center gap-2 px-4 py-2 text-teal-700 hover:text-teal-800 transition"
      >
        <Plus size={18} />
        <span className="text-sm">保護者追加</span>
      </button>
    </div>
  );
}
