"use client";

import DriverHeader from "./DriverHeader";
import ChildAssignmentList from "./ChildAssignmentList";

interface Props {
  index: number;
  removeDriver: (index: number) => void;
  availabilityDrivers: {
    id: number;
    member: { id: number; name: string };
    seats: number;
    availability: boolean;
  }[];
  childrenList: { id: number; name: string }[];
}

export default function RideDriverItem({
  index,
  removeDriver,
  availabilityDrivers,
  childrenList,
}: Props) {
  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 md:p-5 shadow-sm space-y-4 bg-gray-50 hover:shadow-md transition-shadow">
      <DriverHeader
        index={index}
        availabilityDrivers={availabilityDrivers}
        onRemove={() => removeDriver(index)}
      />

      <ChildAssignmentList
        index={index}
        childrenList={childrenList}
        availabilityDrivers={availabilityDrivers}
      />
    </div>
  );
}
