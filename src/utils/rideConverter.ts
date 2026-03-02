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
  type?: string;
  escorts?: {
    id: number;
    availabilityDriverId: number;
    rideAssignments: {
      id: number;
      child: { id: number; name: string };
    }[];
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
    // type==="escort" のドライバーはトップレベルに含めない（各ドライバーのescorts配列に入っている）
    drivers: (ride.drivers ?? [])
      .filter(driver => (driver.type ?? 'driver') !== 'escort')
      .map(driver => ({
        availabilityDriverId: driver.availabilityDriverId,
        type: 'driver',
        seats: driver.seats ?? 0,
        rideAssignments: driver.rideAssignments.map((rideAssignment) => ({
          childId: rideAssignment.child.id,
        })),
        escorts: (driver.escorts ?? []).map(escort => ({
          availabilityDriverId: escort.availabilityDriverId,
          rideAssignments: escort.rideAssignments.map((ra) => ({
            childId: ra.child.id,
          })),
        })),
      })),
  };
};
