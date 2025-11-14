export interface Ride {
  id: number;
  date: Date;
  destination: string;
}

export interface RideFormValues {
  date: Date;
  destination: string;
}

export interface UpdateRideValues {
  date: Date;
  destination: string;
  drivers: {
    availabilityDriverId: number;
    seats: number;
    rideAssignments: {childId: number }[];
  }[];
}