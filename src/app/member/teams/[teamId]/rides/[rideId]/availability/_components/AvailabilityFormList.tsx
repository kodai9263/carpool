'use client';

import { Plus } from "lucide-react";
import { Control, UseFormRegister, useFieldArray } from "react-hook-form";
import AvailabilityFormItem from "./AvailabilityFormItem";
import { AvailabilityListFormValues } from "@/app/_types/availability";

interface Props {
  members: Array<{ id: number; name: string }>;
  registeredMemberIds: Set<number>;
  existingAvailabilities: Map<number, { seats: number; availability: boolean }>;
  register: UseFormRegister<AvailabilityListFormValues>;
  control: Control<AvailabilityListFormValues>;
}

export default function AvailabilityFormList({
  members,
  registeredMemberIds,
  existingAvailabilities,
  register,
  control,
}: Props) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "availabilities",
  });

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <AvailabilityFormItem
          key={field.id}
          index={index}
          members={members}
          registeredMemberIds={registeredMemberIds}
          existingAvailabilities={existingAvailabilities}
          onRemove={() => remove(index)}
          register={register}
          control={control}
          canRemove={fields.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={() => append({ memberId: 0, availability: false, seats: 1 })}
        className="flex items-center gap-2 px-4 py-2 text-teal-700 hover:text-teal-800 transition"
      >
        <Plus size={18} />
        <span className="text-sm">保護者追加</span>
      </button>
    </div>
  );
}
