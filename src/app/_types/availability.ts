export interface AvailabilityFormValues {
  guardianId: number;
  driverAvailability: boolean;
  driverDirection: "outbound" | "inbound" | "both";
  seats: number;
  driverComment: string;
  escortAvailability: boolean;
  escortDirection: "outbound" | "inbound" | "both";
  escortComment: string;
  childAvailabilities?: { childId: number; availability: boolean }[];
}

export interface AvailabilityListFormValues {
  availabilities: AvailabilityFormValues[];
}