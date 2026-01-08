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
    child: { name: string };
  }>;
}

interface Props {
  drivers: Driver[];
}

export default function RideDriverGrid({ drivers }: Props) {
  return (
    <div className="grid grid-cols-3 gap-6 w-full max-w-[920px]">
      {drivers.map((driver) => (
        <RideDriverCard key={driver.id} driver={driver} />
      ))}
    </div>
  );
}
