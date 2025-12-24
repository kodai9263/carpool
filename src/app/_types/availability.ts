export interface AvailabilityFormValues {
  memberId: number;
  availability: boolean;
  seats: number;
}

export interface AvailabilityListFormValues {
  availabilities: AvailabilityFormValues[];
}