export interface Ride {
  id: number;
  date: string;
  destination: string;
}

export interface RideFormValues {
  date: string;
  destination: string;
}

export interface UpdateRideValues {
  date: string;
  destination: string;
  drivers: {
    availabilityDriverId: number;
    seats: number;
    rideAssignments: {childId: number }[];
  }[];
}