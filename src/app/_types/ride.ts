export interface Ride {
  id: number;
  date: string;
  destination: string;
  isAssignmentComplete?: boolean;
}

export interface RideFormValues {
  date: Date | null;
  destination: string;
}

export interface UpdateRideValues {
  date: Date | null;
  destination: string;
  separateDirections: boolean;
  drivers: {
    availabilityDriverId: number;
    type: string;
    direction: "outbound" | "inbound";
    seats: number;
    rideAssignments: { childId: number }[];
    escorts: {
      availabilityDriverId: number;
      direction: "outbound" | "inbound";
      rideAssignments: { childId: number }[];
    }[];
  }[];
}