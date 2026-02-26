export interface RideListResponse {
  status: "OK";
  rides: { id: number; date: Date, destination: string; isAssignmentComplete: boolean }[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface CreateRideResponse {
  status: "OK";
  message: string;
  id: number;
}

export interface RideDetailResponse {
  status: "OK";
  ride: {
    id: number;
    date: string;
    destination: string;
    deadline?: string | null;
    team?: {
      viewPinHash: string;
    };
    drivers: {
      id: number;
      availabilityDriverId: number;
      availabilityDriver: {
        guardian: { id: number; name: string };
        seats: number;
      };
      rideAssignments: {
        id: number;
        child: { id: number; name: string; currentGrade: number | null };
      }[];
    }[];
    availabilityDrivers: {
      id: number;
      seats: number;
      availability: boolean;
      comment: string | null;
      guardian: { id: number; name: string };
    }[];

    children: {
      id: number;
      name: string;
      grade: number | null;
      gradeYear: number | null;
      currentGrade: number | null;
      memberId?: number;
    }[];

    teamName?: string;
    pin?: string | null;

    guardians?: {
      id: number;
      name: string;
      memberId: number;
    }[];

    childAvailabilities: {
      childId: number;
      availability: boolean;
    }[];
  };
}

export interface UpdateRideResponse {
  status: "OK";
  message: string;
  ride?: {
    id: number;
    date: string;
    destination: string;
    drivers: {
      id: number;
      availabilityDriver: {
        guardian: { id: number; name: string };
        seats: number;
      };
      rideAssignments: {
        id: number;
        child: { id: number; name: string };
      }[];
    }[];
  } | null;
}
