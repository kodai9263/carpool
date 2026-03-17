import { UpdateRideValues } from "@/app/_types/ride";

// APIから取得したドライバー情報
export interface DriverFormAPI {
  id: number;
  availabilityDriverId: number;
  direction?: string;
  seats?: number;
  rideAssignments: {
    id: number;
    child: { id: number; name: string };
  }[];
  type?: string;
  escorts?: {
    id: number;
    availabilityDriverId: number;
    direction?: string;
    rideAssignments: {
      id: number;
      child: { id: number; name: string };
    }[];
  }[];
};

interface RideDetailAPI {
  date?: string;
  destination: string;
  separateDirections?: boolean;
  drivers?: DriverFormAPI[];
}

// APIレスポンスからドライバー情報を変換
export const convertRideDetailToFormValues = (ride: RideDetailAPI) : UpdateRideValues => {
  return {
    date: ride.date ? new Date(ride.date) : null,
    destination: ride.destination,
    separateDirections: ride.separateDirections ?? false,
    // type==="escort" のドライバーはトップレベルに含めない（各ドライバーのescorts配列に入っている）
    drivers: (ride.drivers ?? [])
      .filter(driver => (driver.type ?? 'driver') !== 'escort')
      .map(driver => ({
        availabilityDriverId: driver.availabilityDriverId,
        type: 'driver',
        direction: (driver.direction ?? 'outbound') as "outbound" | "inbound",
        seats: driver.seats ?? 0,
        rideAssignments: driver.rideAssignments.map((rideAssignment) => ({
          childId: rideAssignment.child.id,
        })),
        escorts: (driver.escorts ?? []).map(escort => ({
          availabilityDriverId: escort.availabilityDriverId,
          direction: (escort.direction ?? 'outbound') as "outbound" | "inbound",
          rideAssignments: escort.rideAssignments.map((ra) => ({
            childId: ra.child.id,
          })),
        })),
      })),
  };
};
