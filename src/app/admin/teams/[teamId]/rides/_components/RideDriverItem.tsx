'use client';

import { UpdateRideValues } from "@/app/_types/ride";
import { Control, UseFormRegister } from "react-hook-form";
import DriverHeader from "./DriverHeader";
import ChildAssignmentList from "./ChildAssignmentList";

interface Props {
  index: number;
  register: UseFormRegister<UpdateRideValues>;
  control: Control<UpdateRideValues>;
  removeDriver: (index: number) => void;
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
    seats: number;
  }[];
  childrenList: { id: number; name: string }[];
};

export default function RideDriverItem({
  index,
  register,
  control, 
  removeDriver,
  availabilityDrivers,
  childrenList,
}: Props) {

  return (
    <div className="border border-gray-200 rounded-xl p-4 shadow-sm space-y-4 w-[240px]">
      <DriverHeader
        index={index}
        register={register}
        control={control}
        availabilityDrivers={availabilityDrivers}
        onRemove={() => removeDriver(index)}
      />

      <ChildAssignmentList 
        index={index}
        control={control}
        register={register}
        childrenList={childrenList}
        availabilityDrivers={availabilityDrivers}
      />
    </div>
  );
}