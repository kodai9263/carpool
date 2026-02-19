"use client";

import RideDriverCard from "./RideDriverCard";

interface Driver {
  id: number;
  availabilityDriver: {
    member: { name: string };
    seats: number;
  };
  rideAssignments: Array<{
    id: number;
    child: { name: string; currentGrade: number | null };
  }>;

}

interface Props {
  drivers: Driver[];
}

export default function RideDriverGrid({ drivers }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
      {drivers.map((driver) => (
        <div key={driver.id} className="min-w-0">
          <RideDriverCard driver={driver} />
        </div>
      ))}
    </div>
  );
}
