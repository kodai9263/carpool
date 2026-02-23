export interface AvailabilityFormValues {
  memberId: number;
  availability: boolean;
  seats: number;
  comment: string;
  childAvailabilities?: { childId: number; availability: boolean }[];
}

export interface AvailabilityListFormValues {
  availabilities: AvailabilityFormValues[];
}