"use client";

import { CarFront, User } from "lucide-react";

interface Props {
  driver: {
    id: number;
    availabilityDriver: {
      member: { name: string };
      seats: number;
    };
    rideAssignments: Array<{
      id: number;
      child: { name: string };
    }>;
  };
}

export default function RideDriverCard({ driver }: Props) {
  return (
    <div className="border-2 border-gray-200 rounded-xl p-5 shadow-sm space-y-4 bg-gray-50 hover:shadow-md transition-shadow min-w-[280px]">
      <div className="flex items-center gap-3">
        <CarFront size={24} className="text-teal-700" />
        <div className="font-medium text-base">
          {driver.availabilityDriver.member.name}号
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700 mb-2">乗車する子供</h3>
        {driver.rideAssignments.length > 0 && (
          <div className="space-y-2">
            {driver.rideAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center bg-white p-3 rounded-lg border border-gray-200"
              >
                <User size={18} className="text-gray-600 mr-2 flex-shrink-0" />
                <span className="text-sm">{assignment.child.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
