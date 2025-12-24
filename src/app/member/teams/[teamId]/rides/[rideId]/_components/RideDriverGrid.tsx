'use client';

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
    <div className="mt-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {drivers.map((driver) => (
          <RideDriverCard key={driver.id} driver={driver} />
        ))}
      </div>
    </div>
  );
}
