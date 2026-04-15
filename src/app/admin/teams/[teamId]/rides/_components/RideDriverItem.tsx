"use client";

import DriverHeader from "./DriverHeader";
import ChildAssignmentList from "./ChildAssignmentList";
import EscortSection from "./EscortSection";
import { useFormContext, useWatch } from "react-hook-form";
import { UpdateRideValues } from "@/app/_types/ride";

interface Props {
  index: number;
  direction: "outbound" | "inbound";
  separateDirections: boolean;
  removeDriver: (index: number) => void;
  availabilityDrivers: {
    id: number;
    type: string;
    direction: string;
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
  direction,
  separateDirections,
  removeDriver,
  availabilityDrivers,
  childrenList,
  childAvailabilities,
}: Props) {
  const { control } = useFormContext<UpdateRideValues>();
  const drivers = useWatch({ control, name: "drivers" }) ?? [];
  const driver = drivers[index];

  // 座席数・子供数・引率者数から満席かどうかを判定
  const selectedDriverId = driver?.availabilityDriverId ?? null;
  const childCount = (driver?.rideAssignments ?? []).length;
  const escortCount = (driver?.escorts ?? []).length;
  const selectedDriverSeats = availabilityDrivers.find((d) => d.id === selectedDriverId);
  const seatCount = selectedDriverSeats?.seats ?? 0;
  const isFull = seatCount > 0 && (childCount + escortCount) >= seatCount;

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 md:p-5 shadow-sm space-y-4 bg-gray-50 hover:shadow-md transition-shadow">
      <DriverHeader
        index={index}
        type="driver"
        direction={direction}
        separateDirections={separateDirections}
        availabilityDrivers={availabilityDrivers}
        onRemove={() => removeDriver(index)}
      />

      <ChildAssignmentList
        index={index}
        type="driver"
        childrenList={childrenList}
        availabilityDrivers={availabilityDrivers}
        childAvailabilities={childAvailabilities}
      />

      <EscortSection
        driverIndex={index}
        direction={direction}
        availabilityDrivers={availabilityDrivers}
      />

      {isFull && (
        <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-700 font-medium">
          {seatCount}人まで乗車可能です
        </div>
      )}
    </div>
  );
}
