export interface AvailabilityResponse {
  status: 'OK';
  message: string;
  availabilityDriver: {
    id: number;
    availability: boolean;
    seats: number;
    memberId: number;
    rideId: number;
  };
}