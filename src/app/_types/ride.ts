export interface Ride {
  id: number;
  date: string;
  destination: string;
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
    seats: number;
    rideAssignments: {childId: number }[];
  }[];
}