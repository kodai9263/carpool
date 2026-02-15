export interface AvailabilityResponse {
  status: 'OK';
  message: string;
  availabilityDriver: {
    id: number;
    availability: boolean;
    seats: number;
    comment: string | null;
    memberId: number;
    rideId: number;
  };
}