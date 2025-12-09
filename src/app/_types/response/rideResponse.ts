export interface RideListResponse {
  status: 'OK';
  rides: { id: number; date: Date }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CreateRideResponse {
  status: 'OK';
  message: string;
  id: number;
}

export interface RideDetailResponse {
  status: 'OK';
  ride: {
    id: number;
    date: string;
    destination: string;
    drivers: {
      id: number;
      availabilityDriverId: number;
      availabilityDriver: {
        member: { id: number; name: string };
        seats: number;
      };
      rideAssignments: {
        id: number;
        child: { id: number; name: string };
      }[];
    }[];
    availabilityDrivers: {
      id: number;
      seats: number;
      member: { id: number; name: string };
    }[];

    children: {
      id: number;
      name: string;
    }[];
  };
}

export interface UpdateRideResponse {
  status: 'OK';
  message: string;
  ride?: {
    id: number;
    date: string;
    destination: string;
    drivers: {
      id: number;
      availabilityDriver: {
        member: { id: number; name: string };
        seats: number;
      };
      rideAssignments: {
        id: number;
        child: { id: number; name: string };
      }[];
    }[];
  } | null;
}