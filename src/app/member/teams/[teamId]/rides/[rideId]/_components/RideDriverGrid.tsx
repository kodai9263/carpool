"use client";

import RideDriverCard from "./RideDriverCard";

interface Escort {
  id: number;
  direction: string;
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
  direction: string;
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
  separateDirections: boolean;
}

export default function RideDriverGrid({ drivers, separateDirections }: Props) {
  const outboundDrivers = drivers.filter(d => (d.direction ?? 'outbound') !== 'inbound');
  const inboundDrivers = drivers.filter(d => d.direction === 'inbound');

  const renderSection = (label: string, sectionDrivers: Driver[], emptyMessage: string) => (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-950">{label}</h2>
        <span className="app-status border border-teal-100 bg-teal-50 text-teal-800">
          {sectionDrivers.length}台
        </span>
      </div>
      {sectionDrivers.length > 0 ? (
        <div className="grid w-full max-w-[920px] grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {sectionDrivers.map((driver) => (
            <div key={driver.id} className="min-w-0">
              <RideDriverCard driver={driver} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-5 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {separateDirections ? (
        <>
          {renderSection("行き配車", outboundDrivers, "行きの配車情報はまだありません")}
          {renderSection("帰り配車", inboundDrivers, "帰りの配車情報はまだありません")}
        </>
      ) : (
        renderSection("配車", drivers, "配車情報はまだありません")
      )}
    </div>
  );
}
