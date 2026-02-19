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
      child: { name: string; currentGrade: number | null };
    }>;
  };
}

export default function RideDriverCard({ driver }: Props) {
  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 md:p-5 shadow-sm space-y-4 bg-gray-50 hover:shadow-md transition-shadow min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 min-w-0">
        <CarFront size={24} className="text-teal-700 flex-shrink-0" />
        <div
          className="min-w-0 flex-1 font-medium text-base line-clamp-2 break-all overflow-wrap-anywhere"
          title={`${driver.availabilityDriver.member.name}号`}
        >
          {driver.availabilityDriver.member.name}号
        </div>
      </div>

      <div className="space-y-2 min-w-0">
        <h3 className="text-sm font-medium text-gray-700 mb-2">乗車する子供</h3>
        {driver.rideAssignments.length > 0 && (
          <div className="space-y-2">
            {driver.rideAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-2 min-w-0 bg-white p-3 rounded-lg border border-gray-200"
              >
                <User size={18} className="text-gray-600 flex-shrink-0" />
                <span
                  className="text-sm min-w-0 flex-1 line-clamp-2 break-all overflow-wrap-anywhere"
                  title={assignment.child.name}
                >
                  {assignment.child.name}
                  {assignment.child.currentGrade != null && (
                    <span className="text-xs text-gray-500 ml-1">（{assignment.child.currentGrade}年）</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
