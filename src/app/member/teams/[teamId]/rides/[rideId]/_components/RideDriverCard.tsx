'use client';

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
    <div className="border border-gray-200 rounded-xl p-4 shadow-sm space-y-4 w-full lg:w-[240px] bg-gray-50">
      <div className="flex items-start gap-3">
        <CarFront size={24} className="text-teal-700 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <div className="font-medium text-base">
            {driver.availabilityDriver.member.name}号
          </div>
          <div className="text-sm text-gray-600 mt-1">
            座席数: {driver.availabilityDriver.seats}席
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">乗車する子供</h3>
        {driver.rideAssignments.length > 0 && (
          <div className="space-y-2">
            {driver.rideAssignments.map((assignment) => (
              <div 
                key={assignment.id} 
                className="flex items-center bg-white p-3 rounded border border-gray-200"
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
