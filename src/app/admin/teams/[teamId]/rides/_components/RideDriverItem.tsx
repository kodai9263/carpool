"use client";

import DriverHeader from "./DriverHeader";
import ChildAssignmentList from "./ChildAssignmentList";

interface Props {
  index: number;
  removeDriver: (index: number) => void;
  availabilityDrivers: {
    id: number;
    guardian: { id: number; name: string };
    seats: number;
    availability: boolean;
    comment: string | null;
  }[];
  childrenList: { id: number; name: string; currentGrade: number | null }[];
  childAvailabilities: { childId: number; availability: boolean }[];
}

export default function RideDriverItem({
  index,
  removeDriver,
  availabilityDrivers,
  childrenList,
  childAvailabilities,
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
        childAvailabilities={childAvailabilities}
      />
    </div>
  );
}
