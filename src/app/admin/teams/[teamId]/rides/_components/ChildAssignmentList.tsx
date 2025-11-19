'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { Minus, Plus, User } from "lucide-react";
import { Control, useFieldArray, UseFormRegister } from "react-hook-form";

interface Props {
  index: number;
  control: Control<UpdateRideValues>;
  register: UseFormRegister<UpdateRideValues>;
  childrenList: { id: number; name: string }[];
};

export default function ChildAssignmentList({
  index,
  control,
  register,
  childrenList,
}: Props) {
  const { fields, append, remove, } = useFieldArray({
    control,
    name: `drivers.${index}.rideAssignments`,
  });

  return (
    <div>
      {fields.map((item, childIndex) =>(
        <div key={item.id} className="">
          <User size={18} />

          <select 
            {...register(`drivers.${index}.rideAssignments.${childIndex}.childId`,
              { required: true, valueAsNumber: true }
            )}
            className=""
          >
            <option value="">選択</option>
            {childrenList.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => remove(childIndex)}
            className=""
          >
            <Minus size={20} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => append({ childId: 0 })}
        className=""
      >
        <Plus size={20} />
      </button>
    </div>
  );
}
