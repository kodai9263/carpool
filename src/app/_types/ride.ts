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
  drivers: {
    availabilityDriverId: number;
    type: string;
    seats: number;
    rideAssignments: {childId: number }[];
  }[];
}