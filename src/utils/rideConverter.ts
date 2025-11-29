import { UpdateRideValues } from "@/app/_types/ride";

// APIから取得したドライバー情報
export interface DriverFormAPI {
  id: number;
  availabilityDriverId: number;
  seats?: number;
  rideAssignments: { 
    id: number;
    child: { id: number; name: string };
  }[];
};

interface RideDetailAPI {
  date?: string;
  destination: string;
  drivers?: DriverFormAPI[];
}

// APIレスポンスからドライバー情報を変換
export const convertRideDetailToFormValues = (ride: RideDetailAPI) : UpdateRideValues => {
  return {
    date: ride.date ? new Date(ride.date) : null,
    destination: ride.destination,
    drivers: (ride.drivers ?? []).map(d => ({
      availabilityDriverId: d.availabilityDriverId,
      seats: d.seats ?? 0,
      rideAssignments: d.rideAssignments.map((a: { id: number; child: { id: number; name: string } }) => ({
        childId: a.child.id,
      })),
    })),
  };
};