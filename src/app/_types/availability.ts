export interface AvailabilityFormValues {
  guardianId: number;
  driverAvailability: boolean;
  seats: number;
  driverComment: string;
  escortAvailability: boolean;
  escortComment: string;
  childAvailabilities?: { childId: number; availability: boolean }[];
}

export interface AvailabilityListFormValues {
  availabilities: AvailabilityFormValues[];
}