"use client";

import RideDriverCard from "./RideDriverCard";

interface Driver {
  id: number;
  type: string;
  availabilityDriver: {
    guardian: { name: string };
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
  const driverList = drivers.filter(d => d.type !== 'escort');
  const escortList = drivers.filter(d => d.type === 'escort');

  return (
    <div className="space-y-8">
      {/* 配車ドライバーセクション */}
      <div>
        <h2 className="text-lg font-bold mb-4">🚗 配車</h2>
        {driverList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
            {driverList.map((driver) => (
              <div key={driver.id} className="min-w-0">
                <RideDriverCard driver={driver} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">配車情報はまだありません</p>
        )}
      </div>

      {/* 引率者セクション（引率者がいる場合のみ表示） */}
      {escortList.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">🚶 引率</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full max-w-[920px]">
            {escortList.map((driver) => (
              <div key={driver.id} className="min-w-0">
                <RideDriverCard driver={driver} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
