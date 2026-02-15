export interface AvailabilityFormValues {
  memberId: number;
  availability: boolean;
  seats: number;
  comment: string;
}

export interface AvailabilityListFormValues {
  availabilities: AvailabilityFormValues[];
}