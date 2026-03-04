"use client";

import RideDriverCard from "./RideDriverCard";

interface Escort {
  id: number;
  availabilityDriverId: number;
  availabilityDriver: {
    guardian: { name: string };
    comment: string | null;
  };
  rideAssignments: Array<{
    id: number;
    child: { name: string; currentGrade: number | null };
  }>;
}

interface Driver {
  id: number;
  type: string;
  availabilityDriver: {
    guardian: { name: string };
    seats: number;
    comment: string | null;
  };
  rideAssignments: Array<{
    id: number;
    child: { name: string; currentGrade: number | null };
  }>;
  escorts: Escort[];
}

interface Props {
  drivers: Driver[];
}

export default function RideDriverGrid({ drivers }: Props) {
  return (
    <div>
      <h2 className="text-lg font-bold mb-4">🚗 配車</h2>
      {drivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
          {drivers.map((driver) => (
            <div key={driver.id} className="min-w-0">
              <RideDriverCard driver={driver} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">配車情報はまだありません</p>
      )}
    </div>
  );
}
